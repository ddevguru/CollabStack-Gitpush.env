import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { spawn } from 'child_process';
import { writeFileSync, rmSync, mkdirSync, readdirSync, readFileSync, statSync } from 'fs';
import { promises as fsPromises } from 'fs';
import { join, dirname, relative } from 'path';
import { tmpdir } from 'os';

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

  async executeCommand(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { id } = req.params;
      const { command } = req.body;

      if (!command) {
        throw createError('Command is required', 400);
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
        include: {
          files: true,
        },
      });

      if (!project) {
        throw createError('Project not found or access denied', 404);
      }

      // Create temporary directory for project files
      const tempDir = await fsPromises.mkdtemp(join(tmpdir(), `project-${id}-`));
      
      try {
        // Write all project files to temp directory
        for (const file of project.files.filter(f => !f.isDirectory)) {
          const filePath = join(tempDir, file.path.replace(/^\//, '')); // Remove leading slash
          const dir = dirname(filePath);
          if (dir && dir !== tempDir) {
            mkdirSync(dir, { recursive: true });
          }
          writeFileSync(filePath, file.content);
        }

        // Detect project type and suggest commands if needed
        const projectType = project.projectType || 'generic';
        const hasPackageJson = project.files.some(f => f.path.includes('package.json'));
        const hasRequirementsTxt = project.files.some(f => f.path.includes('requirements.txt'));
        const hasPipfile = project.files.some(f => f.path.includes('Pipfile'));
        const hasPomXml = project.files.some(f => f.path.includes('pom.xml'));
        const hasCargoToml = project.files.some(f => f.path.includes('Cargo.toml'));

        // Parse command
        const parts = command.trim().split(/\s+/);
        let cmd = parts[0];
        let args = parts.slice(1);

        // Auto-detect and prepend package manager if needed
        if (cmd === 'install' && hasPackageJson) {
          cmd = 'npm';
          args = ['install', ...args];
        } else if (cmd === 'start' && hasPackageJson) {
          cmd = 'npm';
          args = ['start', ...args];
        } else if (cmd === 'run' && hasPackageJson) {
          cmd = 'npm';
          args = ['run', ...args];
        } else if (cmd === 'dev' && hasPackageJson) {
          cmd = 'npm';
          args = ['run', 'dev', ...args];
        } else if (cmd === 'install' && (hasRequirementsTxt || hasPipfile)) {
          cmd = 'pip';
          args = ['install', '-r', hasRequirementsTxt ? 'requirements.txt' : '', ...args].filter(Boolean);
        } else if (cmd === 'run' && hasPomXml) {
          cmd = 'mvn';
          args = ['exec:java', ...args];
        } else if (cmd === 'run' && hasCargoToml) {
          cmd = 'cargo';
          args = ['run', ...args];
        }

        // Execute command
        const output: string[] = [];
        const errors: string[] = [];

        return new Promise<void>((resolve, reject) => {
          // Use shell: true for Windows compatibility and better command handling
          const fullCommand = `${cmd} ${args.join(' ')}`;
          
          let child: any;
          let timeout: NodeJS.Timeout;
          let isResolved = false;

          const cleanup = () => {
            // Delay cleanup to allow sync to complete
            setTimeout(() => {
              try {
                rmSync(tempDir, { recursive: true, force: true });
              } catch (cleanupError) {
                console.error('Failed to cleanup temp directory:', cleanupError);
              }
            }, 5000); // Wait 5 seconds before cleanup
          };

          const safeResolve = (data: any) => {
            if (!isResolved) {
              isResolved = true;
              if (timeout) clearTimeout(timeout);
              cleanup();
              res.json(data);
              resolve();
            }
          };

          const safeReject = (error: any) => {
            if (!isResolved) {
              isResolved = true;
              if (timeout) clearTimeout(timeout);
              cleanup();
              reject(error);
            }
          };

          try {
            // When shell: true, first arg should be command string, second is options
            child = spawn(fullCommand, [], {
              shell: true,
              cwd: tempDir,
              stdio: ['ignore', 'pipe', 'pipe'],
              env: {
                ...process.env,
                PATH: process.env.PATH,
              },
            });
          } catch (spawnError: any) {
            safeReject(createError(`Failed to spawn command: ${spawnError.message}`, 500));
            return;
          }

          if (child.stdout) {
            child.stdout.on('data', (data: Buffer) => {
              output.push(data.toString());
            });
          }

          if (child.stderr) {
            child.stderr.on('data', (data: Buffer) => {
              errors.push(data.toString());
            });
          }

          child.on('close', (code: number | null) => {
            const outputText = output.join('');
            const errorText = errors.join('');

            // If command succeeded and it's a package install command, sync files back in background
            if ((code === 0 || code === null) && (cmd === 'npm' || cmd === 'yarn' || cmd === 'pnpm' || cmd === 'pip')) {
              // Run sync in background - don't block response
              setImmediate(async () => {
                try {
                  // Copy tempDir path before cleanup
                  const syncDir = tempDir;
                  await this.syncFilesToDatabase(syncDir, id, req.userId!);
                  console.log(`✅ Files synced for project ${id}`);
                } catch (syncError) {
                  console.error('Failed to sync files after install:', syncError);
                  // Don't fail the command if sync fails
                }
              });
            }

            safeResolve({
              success: code === 0 || code === null,
              data: {
                output: outputText,
                error: errorText,
                exitCode: code,
                command: fullCommand,
              },
            });
          });

          child.on('error', (error: Error) => {
            // Provide helpful error messages
            if ((error as any).code === 'ENOENT') {
              safeReject(createError(`Command not found: ${cmd}. Make sure ${cmd} is installed and in your PATH.`, 400));
            } else {
              safeReject(createError(`Failed to execute command: ${error.message}`, 500));
            }
          });

          // Timeout after 10 minutes for long-running commands
          timeout = setTimeout(() => {
            try {
              if (child && !child.killed) {
                child.kill();
              }
            } catch {}
            safeReject(createError('Command execution timeout (10 minutes)', 408));
          }, 10 * 60 * 1000);
        });
      } catch (error: any) {
        // Cleanup on error
        try {
          rmSync(tempDir, { recursive: true, force: true });
        } catch {}
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  // Helper function to sync files from temp directory to database
  async syncFilesToDatabase(tempDir: string, projectId: string, userId: string) {
    try {
      // Only sync specific important files - don't sync everything
      const importantFiles = ['package-lock.json', 'yarn.lock', 'package.json', 'requirements.txt', 'Pipfile', 'Pipfile.lock'];
      
      const syncFile = async (filePath: string, relativePath: string) => {
        try {
          const stats = statSync(filePath);
          
          if (stats.isDirectory()) {
            return; // Skip directories for now
          }

          // Skip very large files (over 500KB) to avoid database issues
          if (stats.size > 500 * 1024) {
            console.log(`Skipping large file: ${relativePath} (${stats.size} bytes)`);
            return;
          }

          // Only sync important files
          const fileName = relativePath.split('/').pop() || relativePath;
          if (!importantFiles.includes(fileName) && !relativePath.endsWith('.json')) {
            return; // Skip non-important files
          }

          // Read file content
          let content: string;
          try {
            content = readFileSync(filePath, 'utf-8');
          } catch (readError) {
            console.error(`Failed to read file ${relativePath}:`, readError);
            return;
          }
          
          // Check if file exists
          const existingFile = await prisma.file.findUnique({
            where: {
              projectId_path: {
                projectId,
                path: relativePath,
              },
            },
          });

          if (existingFile) {
            // Update existing file
            await prisma.file.update({
              where: { id: existingFile.id },
              data: { content },
            });
            console.log(`✅ Updated file: ${relativePath}`);
          } else {
            // Create new file
            await prisma.file.create({
              data: {
                projectId,
                path: relativePath,
                content,
                isDirectory: false,
              },
            });
            console.log(`✅ Created file: ${relativePath}`);
          }
        } catch (error) {
          console.error(`Failed to sync file ${relativePath}:`, error);
        }
      };

      // Sync only important files from temp directory
      const entries = readdirSync(tempDir);
      for (const entry of entries) {
        // Skip node_modules completely
        if (entry === 'node_modules' || entry.startsWith('.')) continue;
        
        const entryPath = join(tempDir, entry);
        const stats = statSync(entryPath);
        
        if (stats.isFile()) {
          // Sync important files only
          if (importantFiles.includes(entry) || entry.endsWith('.json')) {
            await syncFile(entryPath, entry);
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync files:', error);
      // Don't throw - this is a background operation
    }
  }
}

