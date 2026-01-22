import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

export class TeamController {
  async createTeam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { name, description } = req.body;

      if (!name) {
        throw createError('Team name required', 400);
      }

      const team = await prisma.team.create({
        data: {
          name,
          description,
          leaderId: req.userId,
        },
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: { team },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMyTeams(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const teams = await prisma.team.findMany({
        where: {
          OR: [
            { leaderId: req.userId },
            { members: { some: { userId: req.userId } } },
          ],
        },
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
          _count: {
            select: {
              projects: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: { teams },
      });
    } catch (error) {
      next(error);
    }
  }

  async getTeam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { id } = req.params;

      const team = await prisma.team.findFirst({
        where: {
          id,
          OR: [
            { leaderId: req.userId },
            { members: { some: { userId: req.userId } } },
          ],
        },
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
          projects: {
            select: {
              id: true,
              name: true,
              description: true,
              languages: true,
              visibility: true,
              createdAt: true,
            },
          },
        },
      });

      if (!team) {
        throw createError('Team not found or access denied', 404);
      }

      res.json({
        success: true,
        data: { team },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTeam(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { id } = req.params;
      const { name, description } = req.body;

      // Check if user is leader
      const team = await prisma.team.findFirst({
        where: {
          id,
          leaderId: req.userId,
        },
      });

      if (!team) {
        throw createError('Team not found or you are not the leader', 404);
      }

      const updated = await prisma.team.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
        },
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: { team: updated },
      });
    } catch (error) {
      next(error);
    }
  }

  async addMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { id } = req.params;
      const { userId, role = 'member', pushMode = 'MANUAL' } = req.body;

      if (!userId) {
        throw createError('User ID required', 400);
      }

      // Check if user is leader
      const team = await prisma.team.findFirst({
        where: {
          id,
          leaderId: req.userId,
        },
      });

      if (!team) {
        throw createError('Team not found or you are not the leader', 404);
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      const member = await prisma.teamMember.create({
        data: {
          teamId: id,
          userId,
          role,
          pushMode: pushMode as any,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: { member },
      });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { id, userId } = req.params;

      // Check if user is leader
      const team = await prisma.team.findFirst({
        where: {
          id,
          leaderId: req.userId,
        },
      });

      if (!team) {
        throw createError('Team not found or you are not the leader', 404);
      }

      await prisma.teamMember.deleteMany({
        where: {
          teamId: id,
          userId,
        },
      });

      res.json({
        success: true,
        message: 'Member removed',
      });
    } catch (error) {
      next(error);
    }
  }

  async getMembers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { id } = req.params;

      const team = await prisma.team.findFirst({
        where: {
          id,
          OR: [
            { leaderId: req.userId },
            { members: { some: { userId: req.userId } } },
          ],
        },
      });

      if (!team) {
        throw createError('Team not found or access denied', 404);
      }

      const members = await prisma.teamMember.findMany({
        where: { teamId: id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: { members },
      });
    } catch (error) {
      next(error);
    }
  }
}

