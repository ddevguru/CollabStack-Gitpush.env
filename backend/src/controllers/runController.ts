import { Response, NextFunction } from 'express';
import { PrismaClient, RunStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { CompileService } from '../services/compileService.js';

const prisma = new PrismaClient();
const compileService = new CompileService();

export class RunController {
  async createRun(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId } = req.params;
      const { language, version, code, stdin = '' } = req.body;

      if (!language || !code) {
        throw createError('Language and code required', 400);
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

      // Create run record
      const run = await prisma.run.create({
        data: {
          projectId,
          userId: req.userId,
          language,
          version,
          code,
          stdin,
          status: RunStatus.PENDING,
        },
      });

      // Execute code asynchronously
      compileService.executeCode(run.id, {
        language,
        version,
        code,
        stdin,
      }).catch((error) => {
        console.error('Execution error:', error);
      });

      res.status(201).json({
        success: true,
        data: { run },
      });
    } catch (error) {
      next(error);
    }
  }

  async getRuns(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

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

      const runs = await prisma.run.findMany({
        where: { projectId },
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
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      res.json({
        success: true,
        data: { runs },
      });
    } catch (error) {
      next(error);
    }
  }

  async getRun(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId, runId } = req.params;

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

      const run = await prisma.run.findUnique({
        where: { id: runId },
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
      });

      if (!run || run.projectId !== projectId) {
        throw createError('Run not found', 404);
      }

      res.json({
        success: true,
        data: { run },
      });
    } catch (error) {
      next(error);
    }
  }
}

