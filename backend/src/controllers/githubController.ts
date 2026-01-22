import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { GitHubService } from '../services/githubService.js';
import { emitToRoom } from '../services/socketService.js';

const prisma = new PrismaClient();
const githubService = new GitHubService();

export class GitHubController {
  async connectAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      console.log('GitHub connect request received:', {
        hasUserId: !!req.userId,
        userId: req.userId,
        hasCode: !!req.body.code,
        hasRedirectUri: !!req.body.redirect_uri,
      });

      if (!req.userId) {
        console.error('No userId in request - authentication failed');
        throw createError('Unauthorized - Please log in first', 401);
      }

      const { code, redirect_uri } = req.body;

      if (!code) {
        throw createError('Authorization code required', 400);
      }

      console.log('Calling githubService.connectAccount...');
      const result = await githubService.connectAccount(req.userId, code, redirect_uri);
      console.log('GitHub account connected successfully');

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('GitHub connectAccount error:', {
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
      });
      next(error);
    }
  }

  async createRepo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId } = req.params;
      const { name, isPrivate = true } = req.body;

      // Check if user is team leader
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerTeam: {
            leaderId: req.userId,
          },
        },
        include: {
          ownerTeam: {
            include: {
              leader: true,
            },
          },
        },
      });

      if (!project) {
        throw createError('Project not found or you are not the team leader', 404);
      }

      if (!project.ownerTeam.leader.githubToken) {
        throw createError('GitHub account not connected', 400);
      }

      const repoName = name || project.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');

      // Emit GitHub command to terminal
      emitToRoom(project.roomId, 'terminal:output', {
        projectId,
        type: 'github',
        command: `gh repo create ${repoName}`,
        output: `Creating repository ${repoName}...`,
      });

      const repo = await githubService.createRepository(
        project.ownerTeam.leader.githubToken,
        repoName,
        project.description || '',
        isPrivate
      );

      // Emit success
      emitToRoom(project.roomId, 'terminal:output', {
        projectId,
        type: 'github',
        command: `gh repo create ${repoName}`,
        output: `✓ Repository created: ${repo.html_url}`,
      });

      // Update project with repo info
      await prisma.project.update({
        where: { id: projectId },
        data: {
          githubRepoName: repo.name,
          githubRepoUrl: repo.html_url,
          githubRepoId: repo.id.toString(),
        },
      });

      // Create main branch record
      await prisma.branch.upsert({
        where: {
          projectId_name: {
            projectId,
            name: 'main',
          },
        },
        update: {
          gitBranchName: 'main',
          lastSyncAt: new Date(),
        },
        create: {
          projectId,
          name: 'main',
          gitBranchName: 'main',
          lastSyncAt: new Date(),
        },
      });

      res.json({
        success: true,
        data: { repo },
      });
    } catch (error) {
      next(error);
    }
  }

  async syncProject(req: AuthRequest, res: Response, next: NextFunction) {
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
        include: {
          files: true,
          ownerTeam: {
            include: {
              leader: true,
            },
          },
        },
      });

      if (!project) {
        throw createError('Project not found or access denied', 404);
      }

      if (!project.githubRepoUrl || !project.ownerTeam.leader.githubToken) {
        throw createError('GitHub repository not set up', 400);
      }

      // Emit GitHub command to terminal
      emitToRoom(project.roomId, 'terminal:output', {
        projectId,
        type: 'github',
        command: 'git fetch origin',
        output: 'Fetching latest changes from GitHub...',
      });

      const result = await githubService.syncProject(
        project.ownerTeam.leader.githubToken,
        project.githubRepoName!,
        project.files,
        'main'
      );

      // Emit success
      emitToRoom(project.roomId, 'terminal:output', {
        projectId,
        type: 'github',
        command: 'git fetch origin',
        output: '✓ Synced successfully',
      });

      // Update branch sync time
      await prisma.branch.updateMany({
        where: {
          projectId,
          name: 'main',
        },
        data: {
          lastSyncAt: new Date(),
        },
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async pushToBranch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId } = req.params;
      const { branchName = 'main', commitMessage = 'Update code' } = req.body;

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
        include: {
          files: true,
          ownerTeam: {
            include: {
              leader: true,
            },
          },
        },
      });

      if (!project) {
        throw createError('Project not found or access denied', 404);
      }

      if (!project.githubRepoUrl || !project.ownerTeam.leader.githubToken) {
        throw createError('GitHub repository not set up', 400);
      }

      // Check if user can push to this branch
      if (branchName === 'main') {
        const isLeader = project.ownerTeam.leaderId === req.userId;
        if (!isLeader) {
          throw createError('Only team leader can push to main branch', 403);
        }
      }

      // Emit GitHub command to terminal
      emitToRoom(project.roomId, 'terminal:output', {
        projectId,
        type: 'github',
        command: `git push origin ${branchName}`,
        output: `Pushing to ${branchName}...`,
      });

      const result = await githubService.pushToBranch(
        project.ownerTeam.leader.githubToken,
        project.githubRepoName!,
        branchName,
        project.files,
        commitMessage,
        req.userId
      );

      // Emit success
      emitToRoom(project.roomId, 'terminal:output', {
        projectId,
        type: 'github',
        command: `git push origin ${branchName}`,
        output: `✓ Pushed successfully with message: "${commitMessage}"`,
      });

      // Update branch sync time
      await prisma.branch.updateMany({
        where: {
          projectId,
          name: branchName,
        },
        data: {
          lastSyncAt: new Date(),
        },
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getBranches(req: AuthRequest, res: Response, next: NextFunction) {
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
        include: {
          ownerTeam: {
            include: {
              leader: true,
            },
          },
        },
      });

      if (!project) {
        throw createError('Project not found or access denied', 404);
      }

      if (!project.githubRepoUrl || !project.ownerTeam.leader.githubToken) {
        throw createError('GitHub repository not set up', 400);
      }

      const branches = await githubService.getBranches(
        project.ownerTeam.leader.githubToken,
        project.githubRepoName!
      );

      res.json({
        success: true,
        data: { branches },
      });
    } catch (error) {
      next(error);
    }
  }

  async pushToSpecificBranch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId, branchName } = req.params;
      const { commitMessage = 'Update code' } = req.body;

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
        include: {
          files: true,
          ownerTeam: {
            include: {
              leader: true,
            },
          },
        },
      });

      if (!project) {
        throw createError('Project not found or access denied', 404);
      }

      if (!project.githubRepoUrl || !project.ownerTeam.leader.githubToken) {
        throw createError('GitHub repository not set up', 400);
      }

      // For member branches, allow the member to push
      if (branchName.startsWith('member/')) {
        const username = branchName.replace('member/', '');
        const user = await prisma.user.findUnique({
          where: { id: req.userId },
        });

        if (user?.githubUsername !== username && project.ownerTeam.leaderId !== req.userId) {
          throw createError('You can only push to your own member branch', 403);
        }
      } else if (branchName === 'main' && project.ownerTeam.leaderId !== req.userId) {
        throw createError('Only team leader can push to main branch', 403);
      }

      // Emit GitHub command to terminal
      emitToRoom(project.roomId, 'terminal:output', {
        projectId,
        type: 'github',
        command: `git push origin ${branchName}`,
        output: `Pushing to ${branchName}...`,
      });

      const result = await githubService.pushToBranch(
        project.ownerTeam.leader.githubToken,
        project.githubRepoName!,
        branchName,
        project.files,
        commitMessage,
        req.userId
      );

      // Emit success
      emitToRoom(project.roomId, 'terminal:output', {
        projectId,
        type: 'github',
        command: `git push origin ${branchName}`,
        output: `✓ Pushed successfully with message: "${commitMessage}"`,
      });

      // Update branch sync time
      await prisma.branch.updateMany({
        where: {
          projectId,
          name: branchName,
        },
        data: {
          lastSyncAt: new Date(),
        },
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

