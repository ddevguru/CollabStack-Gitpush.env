import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { PlatformExecutionService } from '../services/platformExecutionService.js';

const platformService = new PlatformExecutionService();

export class PlatformController {
  async execute(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId, code, language, platform, stdin } = req.body;

      if (!projectId || !code || !language || !platform) {
        throw createError('Project ID, code, language, and platform are required', 400);
      }

      const run = await platformService.executeForPlatform(
        projectId,
        req.userId,
        code,
        language,
        platform,
        stdin
      );

      res.status(201).json({
        success: true,
        data: { run },
      });
    } catch (error: any) {
      next(error);
    }
  }

  async getPlatforms(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectType } = req.params;
      const platforms = platformService.getAvailablePlatforms(projectType);

      res.json({
        success: true,
        data: { platforms },
      });
    } catch (error) {
      next(error);
    }
  }
}

