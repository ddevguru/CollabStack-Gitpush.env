import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();
const prisma = new PrismaClient();

// Get all designs for a project
router.get('/projects/:projectId', async (req: AuthRequest, res: Response, next: NextFunction) => {
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

    const designs = await prisma.design.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
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

    res.json({
      success: true,
      data: { designs },
    });
  } catch (error) {
    next(error);
  }
});

// Get a specific design
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw createError('Unauthorized', 401);
    }

    const { id } = req.params;

    const design = await prisma.design.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            ownerTeam: {
              include: {
                members: {
                  where: { userId: req.userId },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!design) {
      throw createError('Design not found', 404);
    }

    // Verify access
    const hasAccess =
      design.project.ownerTeam.leaderId === req.userId ||
      design.project.ownerTeam.members.length > 0;

    if (!hasAccess) {
      throw createError('Access denied', 403);
    }

    res.json({
      success: true,
      data: { design },
    });
  } catch (error) {
    next(error);
  }
});

// Create a new design
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw createError('Unauthorized', 401);
    }

    const { projectId, name, data, thumbnail } = req.body;

    if (!projectId || !name) {
      throw createError('Project ID and name are required', 400);
    }

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

    const design = await prisma.design.create({
      data: {
        projectId,
        userId: req.userId,
        name,
        data: data || '[]',
        thumbnail,
      },
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

    res.json({
      success: true,
      data: { design },
    });
  } catch (error) {
    next(error);
  }
});

// Update a design
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw createError('Unauthorized', 401);
    }

    const { id } = req.params;
    const { name, data, thumbnail } = req.body;

    // Verify ownership or project access
    const design = await prisma.design.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            ownerTeam: {
              include: {
                members: {
                  where: { userId: req.userId },
                },
              },
            },
          },
        },
      },
    });

    if (!design) {
      throw createError('Design not found', 404);
    }

    const hasAccess =
      design.userId === req.userId ||
      design.project.ownerTeam.leaderId === req.userId ||
      design.project.ownerTeam.members.length > 0;

    if (!hasAccess) {
      throw createError('Access denied', 403);
    }

    const updated = await prisma.design.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(data !== undefined && { data }),
        ...(thumbnail !== undefined && { thumbnail }),
      },
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

    res.json({
      success: true,
      data: { design: updated },
    });
  } catch (error) {
    next(error);
  }
});

// Delete a design
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw createError('Unauthorized', 401);
    }

    const { id } = req.params;

    const design = await prisma.design.findUnique({
      where: { id },
    });

    if (!design) {
      throw createError('Design not found', 404);
    }

    if (design.userId !== req.userId) {
      throw createError('Only the creator can delete this design', 403);
    }

    await prisma.design.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Design deleted',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

