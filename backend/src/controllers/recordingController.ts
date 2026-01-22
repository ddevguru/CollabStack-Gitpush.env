import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { RecordingService } from '../services/recordingService.js';

const prisma = new PrismaClient();
const recordingService = new RecordingService();

export class RecordingController {
  async startRecording(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId, sessionName, description } = req.body;

      if (!projectId || !sessionName) {
        throw createError('Project ID and session name required', 400);
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

      const recording = await recordingService.startRecording(projectId, sessionName, description);

      res.status(201).json({
        success: true,
        data: { recording },
      });
    } catch (error) {
      next(error);
    }
  }

  async stopRecording(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { recordingId } = req.params;
      const recording = await recordingService.stopRecording(recordingId);

      res.json({
        success: true,
        data: { recording },
      });
    } catch (error) {
      next(error);
    }
  }

  async listRecordings(req: AuthRequest, res: Response, next: NextFunction) {
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

      const recordings = await recordingService.listRecordings(projectId);

      res.json({
        success: true,
        data: { recordings },
      });
    } catch (error) {
      next(error);
    }
  }

  async getRecording(req: Request, res: Response, next: NextFunction) {
    try {
      const { shareToken } = req.params;
      const recording = await recordingService.getRecording(shareToken);

      res.json({
        success: true,
        data: { recording },
      });
    } catch (error) {
      next(error);
    }
  }
}

