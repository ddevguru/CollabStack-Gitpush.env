import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { ShareService } from '../services/shareService.js';

const prisma = new PrismaClient();
const shareService = new ShareService();

export class ShareController {
  async createShareLink(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const {
        projectId,
        fileId,
        code,
        accessType = 'READ_ONLY',
        expiresAt,
        maxViews,
        password,
      } = req.body;

      // If projectId or fileId provided, check access
      if (projectId) {
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
      }

      const shareLink = await shareService.createShareLink(
        projectId,
        fileId,
        code,
        accessType,
        expiresAt ? new Date(expiresAt) : undefined,
        maxViews,
        password
      );

      res.status(201).json({
        success: true,
        data: { shareLink },
      });
    } catch (error) {
      next(error);
    }
  }

  async getShareLink(req: Request, res: Response, next: NextFunction) {
    try {
      const { shortCode } = req.params;
      const { password } = req.query;

      const shareLink = await shareService.getShareLink(shortCode as string, password as string);

      res.json({
        success: true,
        data: { shareLink },
      });
    } catch (error) {
      next(error);
    }
  }

  async getQRCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { shortCode } = req.params;
      const qrCodeUrl = shareService.generateQRCode(shortCode);

      res.json({
        success: true,
        data: { qrCodeUrl },
      });
    } catch (error) {
      next(error);
    }
  }
}

