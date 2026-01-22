import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();
const prisma = new PrismaClient();

// Get chat history for a project
router.get('/projects/:projectId/history', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw createError('Unauthorized', 401);
    }

    const { projectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    // Verify user has access to project
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

    // Get chat messages from session events
    const chatEvents = await prisma.sessionEvent.findMany({
      where: {
        projectId,
        type: 'chat',
      },
      orderBy: {
        timestamp: 'asc',
      },
      take: limit,
    });

    // Format messages and get user info
    const messages = await Promise.all(chatEvents.map(async (event) => {
      const data = event.data as any;
      const userId = data?.userId;
      
      let userName = 'Unknown';
      let avatar = null;
      
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true, avatar: true },
        });
        if (user) {
          userName = user.name;
          avatar = user.avatar;
        }
      }
      
      return {
        userId: userId || null,
        userName,
        avatar,
        message: data?.message || '',
        timestamp: event.timestamp.toISOString(),
      };
    }));

    res.json({
      success: true,
      data: { messages },
    });
  } catch (error) {
    next(error);
  }
});

// Get active users in a project
router.get('/projects/:projectId/users', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw createError('Unauthorized', 401);
    }

    const { projectId } = req.params;

    // Verify user has access to project
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

    // Get active sessions
    const sessions = await prisma.session.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    const users = sessions.map((s) => ({
      userId: s.user.id,
      userName: s.user.name,
      avatar: s.user.avatar,
    }));

    res.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

