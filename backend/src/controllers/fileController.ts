import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

export class FileController {
  async createFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId } = req.params;
      const { path, content = '', isDirectory = false, parentId } = req.body;

      if (!path) {
        throw createError('File path required', 400);
      }

      // Check access
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
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

      // Check if file already exists
      const existing = await prisma.file.findUnique({
        where: {
          projectId_path: {
            projectId,
            path,
          },
        },
      });

      if (existing) {
        throw createError('File already exists', 409);
      }

      const file = await prisma.file.create({
        data: {
          projectId,
          path,
          content,
          isDirectory,
          parentId,
        },
      });

      res.status(201).json({
        success: true,
        data: { file },
      });
    } catch (error) {
      next(error);
    }
  }

  async getFiles(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId } = req.params;

      // Check access
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
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

      const files = await prisma.file.findMany({
        where: { projectId },
        orderBy: [
          { isDirectory: 'desc' },
          { path: 'asc' },
        ],
      });

      res.json({
        success: true,
        data: { files },
      });
    } catch (error) {
      next(error);
    }
  }

  async getFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId, fileId } = req.params;

      // Check access
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
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

      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file || file.projectId !== projectId) {
        throw createError('File not found', 404);
      }

      res.json({
        success: true,
        data: { file },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId, fileId } = req.params;
      const { content, path } = req.body;

      // Check access
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
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

      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file || file.projectId !== projectId) {
        throw createError('File not found', 404);
      }

      const updated = await prisma.file.update({
        where: { id: fileId },
        data: {
          ...(content !== undefined && { content }),
          ...(path && { path }),
        },
      });

      // Check if auto-push is enabled and trigger it
      const settings = project.settings as any;
      if (settings?.autoPush && project.githubRepoName) {
        // Get project with all files for sync
        const projectFiles = await prisma.file.findMany({
          where: { projectId },
        });

        // Get leader's GitHub token
        const team = await prisma.team.findUnique({
          where: { id: project.ownerTeamId },
          include: {
            leader: {
              select: { githubToken: true },
            },
          },
        });

        // Trigger auto-push in background (don't wait for it)
        if (team?.leader.githubToken) {
          setImmediate(async () => {
            try {
              const { GitHubService } = await import('../services/githubService.js');
              const githubService = new GitHubService();
              
              await githubService.syncProject(
                team.leader.githubToken!,
                project.githubRepoName!,
                projectFiles.map((f: { path: string; content: string; isDirectory: boolean }) => ({ path: f.path, content: f.content, isDirectory: f.isDirectory })),
                'main'
              );
            } catch (error) {
              // Silently fail - don't block file save
              console.error('Auto-push failed:', error);
            }
          });
        }
      }

      // Check if Drive auto-sync is enabled and trigger it
      if (project.driveSyncMode === 'AUTO' && project.driveFolderId) {
        // Get project with all files for sync
        const projectFiles = await prisma.file.findMany({
          where: { projectId },
        });

        // Get user's Google token
        const user = await prisma.user.findUnique({
          where: { id: req.userId },
          select: { googleToken: true },
        });

        // Trigger auto-sync to Drive in background (don't wait for it)
        if (user?.googleToken && project.driveFolderId) {
          setImmediate(async () => {
            try {
              const { DriveService } = await import('../services/driveService.js');
              const driveService = new DriveService();
              
              // Refresh token if needed
              let token = user.googleToken!;
              try {
                await driveService.syncProject(
                  token,
                  project.driveFolderId!,
                  projectFiles.map((f: { path: string; content: string; isDirectory: boolean }) => ({ 
                    path: f.path, 
                    content: f.content, 
                    isDirectory: f.isDirectory 
                  })),
                  project.name
                );
                console.log(`✅ Auto-synced to Drive: ${project.name}`);
              } catch (syncError: any) {
                // If token expired, try to refresh
                if (syncError.response?.status === 401) {
                  const userWithRefresh = await prisma.user.findUnique({
                    where: { id: req.userId },
                    select: { googleRefreshToken: true },
                  });
                  
                  if (userWithRefresh?.googleRefreshToken) {
                    token = await driveService.refreshToken(userWithRefresh.googleRefreshToken);
                    await prisma.user.update({
                      where: { id: req.userId },
                      data: { googleToken: token },
                    });
                    
                    // Retry sync
                    await driveService.syncProject(
                      token,
                      project.driveFolderId!,
                      projectFiles.map((f: { path: string; content: string; isDirectory: boolean }) => ({ 
                        path: f.path, 
                        content: f.content, 
                        isDirectory: f.isDirectory 
                      })),
                      project.name
                    );
                    console.log(`✅ Auto-synced to Drive (after refresh): ${project.name}`);
                  } else {
                    throw syncError;
                  }
                } else {
                  throw syncError;
                }
              }
            } catch (error) {
              // Silently fail - don't block file save
              console.error('Auto-sync to Drive failed:', error);
            }
          });
        } else if (project.driveSyncMode === 'AUTO' && !project.driveFolderId) {
          console.warn(`⚠️ Auto-sync enabled but no Drive folder for project: ${project.name}`);
        }
      }

      res.json({
        success: true,
        data: { file: updated },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteFile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId, fileId } = req.params;

      // Check access
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
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

      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file || file.projectId !== projectId) {
        throw createError('File not found', 404);
      }

      await prisma.file.delete({
        where: { id: fileId },
      });

      res.json({
        success: true,
        message: 'File deleted',
      });
    } catch (error) {
      next(error);
    }
  }
}

