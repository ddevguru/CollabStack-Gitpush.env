import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { ReviewService } from '../services/reviewService.js';

const prisma = new PrismaClient();
const reviewService = new ReviewService();

export class ReviewController {
  async createReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId, filePath } = req.body;

      if (!projectId || !filePath) {
        throw createError('Project ID and file path are required', 400);
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

      const review = await reviewService.createReview(projectId, filePath, req.userId);

      res.status(201).json({
        success: true,
        data: { review },
      });
    } catch (error) {
      next(error);
    }
  }

  async addComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { reviewId } = req.params;
      const { line, comment } = req.body;

      if (!line || !comment) {
        throw createError('Line number and comment are required', 400);
      }

      const review = await reviewService.addComment(reviewId, line, comment, req.userId);

      res.json({
        success: true,
        data: { review },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { reviewId } = req.params;
      const { status } = req.body;

      if (!['APPROVED', 'CHANGES_REQUESTED', 'PENDING'].includes(status)) {
        throw createError('Invalid status', 400);
      }

      const review = await reviewService.updateStatus(reviewId, status);

      res.json({
        success: true,
        data: { review },
      });
    } catch (error) {
      next(error);
    }
  }

  async getProjectReviews(req: AuthRequest, res: Response, next: NextFunction) {
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

      const reviews = await reviewService.getProjectReviews(projectId);

      res.json({
        success: true,
        data: { reviews },
      });
    } catch (error) {
      next(error);
    }
  }

  async getReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { reviewId } = req.params;
      const review = await reviewService.getReview(reviewId);

      if (!review) {
        throw createError('Review not found', 404);
      }

      res.json({
        success: true,
        data: { review },
      });
    } catch (error) {
      next(error);
    }
  }
}

