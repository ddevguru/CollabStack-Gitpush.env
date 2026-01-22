import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

export class ExtensionController {
  async getMarketplace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      // In production, this would fetch from VS Code Marketplace API
      // For now, return default extensions
      const extensions = [
        {
          id: 'prettier',
          name: 'Prettier',
          publisher: 'Prettier',
          description: 'Code formatter for JavaScript, TypeScript, CSS, and more',
          version: '9.0.0',
          category: 'Formatter',
        },
        {
          id: 'eslint',
          name: 'ESLint',
          publisher: 'Microsoft',
          description: 'Find and fix problems in your JavaScript code',
          version: '3.0.0',
          category: 'Linter',
        },
        {
          id: 'gitlens',
          name: 'GitLens',
          publisher: 'GitKraken',
          description: 'Supercharge Git capabilities with GitLens',
          version: '14.0.0',
          category: 'Git',
        },
        {
          id: 'thunder-client',
          name: 'Thunder Client',
          publisher: 'Ranga Vadhineni',
          description: 'Lightweight REST API Client for VS Code',
          version: '1.19.0',
          category: 'API',
        },
        {
          id: 'auto-rename-tag',
          name: 'Auto Rename Tag',
          publisher: 'Jun Han',
          description: 'Auto rename paired HTML/XML tag',
          version: '0.1.10',
          category: 'HTML',
        },
        {
          id: 'bracket-pair-colorizer',
          name: 'Bracket Pair Colorizer',
          publisher: 'CoenraadS',
          description: 'Colorize matching brackets',
          version: '1.0.62',
          category: 'Editor',
        },
      ];

      res.json({
        success: true,
        data: { extensions },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectExtensions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId } = req.params;

      // Verify access
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

      // Get installed extensions from project settings
      const settings = project.settings as any;
      const installedExtensions = settings?.extensions || [];

      res.json({
        success: true,
        data: { extensions: installedExtensions },
      });
    } catch (error) {
      next(error);
    }
  }

  async installExtension(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId } = req.params;
      const { extensionId } = req.body;

      if (!extensionId) {
        throw createError('Extension ID required', 400);
      }

      // Verify access
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

      // Add extension to project settings
      const settings = project.settings as any;
      const extensions = settings?.extensions || [];
      
      if (!extensions.includes(extensionId)) {
        extensions.push(extensionId);
      }

      await prisma.project.update({
        where: { id: projectId },
        data: {
          settings: {
            ...settings,
            extensions,
          } as any,
        },
      });

      res.json({
        success: true,
        data: { extensionId },
      });
    } catch (error) {
      next(error);
    }
  }

  async uninstallExtension(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId, extensionId } = req.params;

      // Verify access
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

      // Remove extension from project settings
      const settings = project.settings as any;
      const extensions = (settings?.extensions || []).filter((id: string) => id !== extensionId);

      await prisma.project.update({
        where: { id: projectId },
        data: {
          settings: {
            ...settings,
            extensions,
          } as any,
        },
      });

      res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }
}

