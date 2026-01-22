import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { AcademicIntegrityService } from '../services/academicIntegrityService.js';

const prisma = new PrismaClient();
const academicService = new AcademicIntegrityService();

export class AcademicController {
  async enableExamMode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId } = req.params;
      const { lockDownUntil } = req.body;

      // Check if user is team leader
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerTeam: {
            leaderId: req.userId,
          },
        },
      });

      if (!project) {
        throw createError('Project not found or you are not the team leader', 404);
      }

      const result = await academicService.enableExamMode(
        projectId,
        new Date(lockDownUntil)
      );

      res.json({
        success: true,
        data: { integrity: result },
      });
    } catch (error) {
      next(error);
    }
  }

  async disableExamMode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId } = req.params;

      // Check if user is team leader
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerTeam: {
            leaderId: req.userId,
          },
        },
      });

      if (!project) {
        throw createError('Project not found or you are not the team leader', 404);
      }

      const result = await academicService.disableExamMode(projectId);

      res.json({
        success: true,
        data: { integrity: result },
      });
    } catch (error) {
      next(error);
    }
  }

  async checkPlagiarism(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId } = req.params;
      const { code } = req.body;

      if (!code) {
        throw createError('Code required', 400);
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

      const score = await academicService.checkPlagiarism(projectId, code);

      res.json({
        success: true,
        data: {
          plagiarismScore: score,
          riskLevel: score > 70 ? 'HIGH' : score > 40 ? 'MEDIUM' : 'LOW',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getStatus(req: AuthRequest, res: Response, next: NextFunction) {
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

      const status = await academicService.getStatus(projectId);

      res.json({
        success: true,
        data: { integrity: status },
      });
    } catch (error) {
      next(error);
    }
  }
}

