import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { MetricsService } from '../services/metricsService.js';

const prisma = new PrismaClient();
const metricsService = new MetricsService();

export class MetricsController {
  async analyzeCode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId, filePath, code, language } = req.body;

      if (!projectId || !filePath || !code || !language) {
        throw createError('Project ID, file path, code, and language are required', 400);
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

      const metric = await metricsService.analyzeCode(projectId, filePath, code, language);

      res.json({
        success: true,
        data: { metric },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectMetrics(req: AuthRequest, res: Response, next: NextFunction) {
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

      const metrics = await metricsService.getProjectMetrics(projectId);

      res.json({
        success: true,
        data: { metrics },
      });
    } catch (error) {
      next(error);
    }
  }
}

