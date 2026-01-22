import { Router, Response, NextFunction } from 'express';
import { UserController } from '../controllers/userController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const userController = new UserController();

router.get('/me', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await userController.getProfile(req, res, next);
});

router.put('/me', async (req: AuthRequest, res, next) => {
  await userController.updateProfile(req, res, next);
});

// Search users by email (for adding team members)
router.get('/search', async (req: AuthRequest, res, next) => {
  await userController.searchUsers(req, res, next);
});

export default router;
