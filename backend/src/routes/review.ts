import { Router, Response, NextFunction } from 'express';
import { ReviewController } from '../controllers/reviewController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const reviewController = new ReviewController();

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await reviewController.createReview(req, res, next);
});

router.post('/:reviewId/comments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await reviewController.addComment(req, res, next);
});

router.put('/:reviewId/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await reviewController.updateStatus(req, res, next);
});

router.get('/project/:projectId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await reviewController.getProjectReviews(req, res, next);
});

router.get('/:reviewId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await reviewController.getReview(req, res, next);
});

export default router;

