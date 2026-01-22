import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ReviewService {
  /**
   * Create a code review
   */
  async createReview(
    projectId: string,
    filePath: string,
    reviewerId: string
  ): Promise<any> {
    return prisma.codeReview.create({
      data: {
        projectId,
        filePath,
        reviewerId,
        status: 'PENDING',
        comments: [],
      },
    });
  }

  /**
   * Add comment to review
   */
  async addComment(
    reviewId: string,
    line: number,
    comment: string,
    userId: string
  ): Promise<any> {
    const review = await prisma.codeReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    const comments = review.comments as any[];
    comments.push({
      id: Date.now().toString(),
      line,
      comment,
      userId,
      timestamp: new Date().toISOString(),
    });

    return prisma.codeReview.update({
      where: { id: reviewId },
      data: {
        comments: comments as any,
      },
    });
  }

  /**
   * Update review status
   */
  async updateStatus(
    reviewId: string,
    status: 'APPROVED' | 'CHANGES_REQUESTED' | 'PENDING'
  ): Promise<any> {
    return prisma.codeReview.update({
      where: { id: reviewId },
      data: { status },
    });
  }

  /**
   * Get reviews for a project
   */
  async getProjectReviews(projectId: string): Promise<any[]> {
    return prisma.codeReview.findMany({
      where: { projectId },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get review by ID
   */
  async getReview(reviewId: string): Promise<any> {
    return prisma.codeReview.findUnique({
      where: { id: reviewId },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }
}

