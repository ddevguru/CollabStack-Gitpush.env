import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

export class UserController {
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          githubUsername: true,
          authProviders: true,
          googleToken: true, // Check if Google is connected
          createdAt: true,
        },
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      // Convert to response format (don't expose token, just connection status)
      const userResponse = {
        ...user,
        hasGoogleAccount: !!user.googleToken,
        googleToken: undefined, // Don't expose token
      };

      res.json({
        success: true,
        data: { user: userResponse },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { name, avatar } = req.body;

      const user = await prisma.user.update({
        where: { id: req.userId },
        data: {
          ...(name && { name }),
          ...(avatar !== undefined && { avatar }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          githubUsername: true,
          authProviders: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  async searchUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        throw createError('Email query parameter required', 400);
      }

      // Normalize email for search (trim and lowercase)
      const normalizedEmail = email.trim().toLowerCase();
      
      const users = await prisma.user.findMany({
        where: {
          email: {
            contains: normalizedEmail,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
        },
        take: 10,
      });

      res.json({
        success: true,
        data: { users },
      });
    } catch (error) {
      next(error);
    }
  }
}

