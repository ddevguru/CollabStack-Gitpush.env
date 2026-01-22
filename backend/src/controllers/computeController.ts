import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { ComputeService } from '../services/computeService.js';
import { ComputeResourceType } from '@prisma/client';

const computeService = new ComputeService();

export class ComputeController {
  async createJob(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const {
        projectId,
        language,
        code,
        resourceType,
        gpuType,
        scheduledAt,
        dockerImage,
      } = req.body;

      if (!projectId || !language || !code) {
        throw createError('Project ID, language, and code are required', 400);
      }

      const job = await computeService.createJob({
        projectId,
        userId: req.userId,
        language,
        code,
        resourceType: resourceType as ComputeResourceType,
        gpuType,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        dockerImage,
      });

      res.status(201).json({
        success: true,
        data: { job },
      });
    } catch (error: any) {
      next(error);
    }
  }

  async listJobs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const jobs = await computeService.listJobs(req.userId, limit);

      res.json({
        success: true,
        data: { jobs },
      });
    } catch (error) {
      next(error);
    }
  }

  async getJobStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { jobId } = req.params;
      const job = await computeService.getJobStatus(jobId);

      if (!job) {
        throw createError('Job not found', 404);
      }

      // Check access
      if (job.userId !== req.userId) {
        throw createError('Access denied', 403);
      }

      res.json({
        success: true,
        data: { job },
      });
    } catch (error) {
      next(error);
    }
  }

  async getCredits(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const credits = await computeService.getCredits(req.userId);

      res.json({
        success: true,
        data: { credits },
      });
    } catch (error) {
      next(error);
    }
  }

  async scheduleJob(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const {
        projectId,
        language,
        code,
        startTime,
        endTime,
        gpuType,
        gpuCount = 1,
      } = req.body;

      if (!projectId || !language || !code || !startTime || !endTime) {
        throw createError('Missing required fields', 400);
      }

      const job = await computeService.createJob({
        projectId,
        userId: req.userId,
        language,
        code,
        resourceType: ComputeResourceType.GPU,
        gpuType,
        scheduledAt: new Date(startTime),
      });

      res.status(201).json({
        success: true,
        data: { job },
      });
    } catch (error: any) {
      next(error);
    }
  }

  async getAvailableSlots(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { date, gpuType } = req.query;

      // In production, query actual available slots from GPUSchedule
      // For now, return mock data
      const slots = [
        {
          startTime: new Date(date as string).toISOString(),
          endTime: new Date(new Date(date as string).getTime() + 3600000).toISOString(),
          gpuType: gpuType || 'T4',
          available: true,
        },
      ];

      res.json({
        success: true,
        data: { slots },
      });
    } catch (error) {
      next(error);
    }
  }
}

