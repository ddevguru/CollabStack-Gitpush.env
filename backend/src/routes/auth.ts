import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest, authenticate } from '../middleware/auth.js';
import { AuthController } from '../controllers/authController.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();
const authController = new AuthController();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('password').isLength({ min: 6 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }
      await authController.register(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }
      await authController.login(req, res, next);
    } catch (error) {
      next(error);
    }
  }
);

router.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await authController.getMe(req, res, next);
  } catch (error) {
    next(error);
  }
});

router.post('/github/callback', async (req, res, next) => {
  try {
    await authController.githubCallback(req, res, next);
  } catch (error) {
    next(error);
  }
});

router.post('/google/callback', async (req, res, next) => {
  try {
    await authController.googleCallback(req, res, next);
  } catch (error) {
    next(error);
  }
});

export default router;

