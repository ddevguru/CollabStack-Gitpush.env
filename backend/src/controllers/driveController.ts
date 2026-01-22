import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { DriveService } from '../services/driveService.js';

const prisma = new PrismaClient();
const driveService = new DriveService();

export class DriveController {
  async connectAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { code } = req.body;

      if (!code) {
        throw createError('Authorization code required', 400);
      }

      const result = await driveService.connectAccount(req.userId, code);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async createFolder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId } = req.params;
      const { folderId } = req.body;

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

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
      });

      if (!user?.googleToken) {
        throw createError('Google Drive account not connected', 400);
      }

      let driveFolderId = folderId;

      if (!driveFolderId) {
        // Create new folder
        const folder = await driveService.createFolder(
          user.googleToken,
          project.name,
          project.description || ''
        );
        driveFolderId = folder.id;
      }

      // Update project
      await prisma.project.update({
        where: { id: projectId },
        data: {
          driveFolderId,
        },
      });

      res.json({
        success: true,
        data: { folderId: driveFolderId },
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

      if (!project.driveFolderId) {
        throw createError('Drive folder not set up', 400);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
      });

      if (!user?.googleToken) {
        throw createError('Google Drive account not connected', 400);
      }

      const result = await driveService.syncProject(
        user.googleToken,
        project.driveFolderId,
        project.files,
        project.name
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async exportProject(req: AuthRequest, res: Response, next: NextFunction) {
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
        },
      });

      if (!project) {
        throw createError('Project not found or access denied', 404);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
      });

      if (!user?.googleToken) {
        throw createError('Google Drive account not connected', 400);
      }

      const result = await driveService.exportAsZip(
        user.googleToken,
        project.files,
        project.name
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

