import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

export class ProjectController {
  async createProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const {
        name,
        description,
        projectType,
        tags,
        languages,
        visibility = 'PRIVATE',
        ownerTeamId,
        settings = {},
        createGitHubRepo = false,
        githubRepoPrivate = true,
      } = req.body;

      if (!name || !ownerTeamId) {
        throw createError('Project name and team ID required', 400);
      }

      // Verify user has access to team
      const team = await prisma.team.findFirst({
        where: {
          id: ownerTeamId,
          OR: [
            { leaderId: req.userId },
            { members: { some: { userId: req.userId } } },
          ],
        },
      });

      if (!team) {
        throw createError('Team not found or access denied', 404);
      }

      const roomId = uuidv4();

      // Auto-detect project type if not provided
      const { ProjectTemplateService } = await import('../services/projectTemplateService.js');
      const templateService = new ProjectTemplateService();
      const detectedType = projectType || templateService.detectProjectType(description, name);

      const project = await prisma.project.create({
        data: {
          name,
          description,
          projectType: detectedType,
          tags: tags || [],
          languages: languages || [],
          visibility: visibility as any,
          ownerTeamId,
          createdBy: req.userId,
          roomId,
          settings: settings as any,
        },
        include: {
          ownerTeam: {
            include: {
              leader: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      // Create main branch
      await prisma.branch.create({
        data: {
          projectId: project.id,
          name: 'main',
          gitBranchName: 'main',
        },
      });

      // Auto-generate folder structure based on project type
      if (detectedType !== 'generic') {
        try {
          await templateService.generateProjectStructure(project.id, detectedType, name);
        } catch (error) {
          console.error('Failed to generate project structure:', error);
          // Continue even if structure generation fails
        }
      }

      // Auto-create GitHub repo if requested
      let githubRepo = null;
      if (createGitHubRepo) {
        try {
          // Get team leader with GitHub token
          const teamWithLeader = await prisma.team.findUnique({
            where: { id: ownerTeamId },
            include: {
              leader: true,
            },
          });

          if (teamWithLeader?.leader.githubToken) {
            const { GitHubService } = await import('../services/githubService.js');
            const githubService = new GitHubService();
            
            const repoName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
            const repo = await githubService.createRepository(
              teamWithLeader.leader.githubToken,
              repoName,
              description || '',
              githubRepoPrivate
            );

            // Update project with repo info
            await prisma.project.update({
              where: { id: project.id },
              data: {
                githubRepoName: repo.name,
                githubRepoUrl: repo.html_url,
                githubRepoId: repo.id.toString(),
              },
            });

            githubRepo = repo;
          }
        } catch (error) {
          console.error('Failed to create GitHub repo:', error);
          // Continue even if repo creation fails
        }
      }

      res.status(201).json({
        success: true,
        data: { project, projectType: detectedType, githubRepo },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjects(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const projects = await prisma.project.findMany({
        where: {
          ownerTeam: {
            OR: [
              { leaderId: req.userId },
              { members: { some: { userId: req.userId } } },
            ],
          },
        },
        include: {
          ownerTeam: {
            select: {
              id: true,
              name: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              files: true,
              branches: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      res.json({
        success: true,
        data: { projects },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { id } = req.params;

      const project = await prisma.project.findFirst({
        where: {
          id,
          ownerTeam: {
            OR: [
              { leaderId: req.userId },
              { members: { some: { userId: req.userId } } },
            ],
          },
        },
        include: {
          ownerTeam: {
            include: {
              leader: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      avatar: true,
                    },
                  },
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          branches: true,
          files: {
            orderBy: { path: 'asc' },
          },
        },
      });

      if (!project) {
        throw createError('Project not found or access denied', 404);
      }

      res.json({
        success: true,
        data: { project },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectByRoom(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { roomId } = req.params;

      const project = await prisma.project.findFirst({
        where: {
          roomId,
          ownerTeam: {
            OR: [
              { leaderId: req.userId },
              { members: { some: { userId: req.userId } } },
            ],
          },
        },
        include: {
          ownerTeam: {
            include: {
              leader: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      avatar: true,
                    },
                  },
                },
              },
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          branches: true,
          files: {
            orderBy: { path: 'asc' },
          },
        },
      });

      if (!project) {
        throw createError('Project not found or access denied', 404);
      }

      res.json({
        success: true,
        data: { project },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { id } = req.params;
      const {
        name,
        description,
        tags,
        languages,
        visibility,
        settings,
        driveSyncMode,
      } = req.body;

      // Check access
      const project = await prisma.project.findFirst({
        where: {
          id,
          ownerTeam: {
            OR: [
              { leaderId: req.userId },
              { members: { some: { userId: req.userId } } },
            ],
          },
        },
      });

      if (!project) {
        throw createError('Project not found or access denied', 404);
      }

      const updated = await prisma.project.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(tags !== undefined && { tags }),
          ...(languages !== undefined && { languages }),
          ...(visibility && { visibility: visibility as any }),
          ...(settings !== undefined && { settings: settings as any }),
          ...(driveSyncMode && { driveSyncMode: driveSyncMode as any }),
        },
        include: {
          ownerTeam: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: { project: updated },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteProject(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { id } = req.params;

      // Check if user is team leader
      const project = await prisma.project.findFirst({
        where: {
          id,
          ownerTeam: {
            leaderId: req.userId,
          },
        },
      });

      if (!project) {
        throw createError('Project not found or you are not the team leader', 404);
      }

      await prisma.project.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Project deleted',
      });
    } catch (error) {
      next(error);
    }
  }

  async createTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { id } = req.params;
      const { title, description, assigneeId, status = 'TODO' } = req.body;

      if (!title) {
        throw createError('Task title required', 400);
      }

      // Check access
      const project = await prisma.project.findFirst({
        where: {
          id,
          ownerTeam: {
            OR: [
              { leaderId: req.userId },
              { members: { some: { userId: req.userId } } },
            ],
          },
        },
      });

      if (!project) {
        throw createError('Project not found or access denied', 404);
      }

      const task = await prisma.task.create({
        data: {
          projectId: id,
          title,
          description,
          assigneeId,
          status: status as any,
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTasks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { id } = req.params;

      // Check access
      const project = await prisma.project.findFirst({
        where: {
          id,
          ownerTeam: {
            OR: [
              { leaderId: req.userId },
              { members: { some: { userId: req.userId } } },
            ],
          },
        },
      });

      if (!project) {
        throw createError('Project not found or access denied', 404);
      }

      const tasks = await prisma.task.findMany({
        where: { projectId: id },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: { tasks },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { id, taskId } = req.params;
      const { title, description, assigneeId, status } = req.body;

      // Check access
      const project = await prisma.project.findFirst({
        where: {
          id,
          ownerTeam: {
            OR: [
              { leaderId: req.userId },
              { members: { some: { userId: req.userId } } },
            ],
          },
        },
      });

      if (!project) {
        throw createError('Project not found or access denied', 404);
      }

      const task = await prisma.task.update({
        where: { id: taskId },
        data: {
          ...(title && { title }),
          ...(description !== undefined && { description }),
          ...(assigneeId !== undefined && { assigneeId }),
          ...(status && { status: status as any }),
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { id, taskId } = req.params;

      // Check access
      const project = await prisma.project.findFirst({
        where: {
          id,
          ownerTeam: {
            OR: [
              { leaderId: req.userId },
              { members: { some: { userId: req.userId } } },
            ],
          },
        },
      });

      if (!project) {
        throw createError('Project not found or access denied', 404);
      }

      await prisma.task.delete({
        where: { id: taskId },
      });

      res.json({
        success: true,
        message: 'Task deleted',
      });
    } catch (error) {
      next(error);
    }
  }
}

