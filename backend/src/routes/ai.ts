import { Router, Response, NextFunction } from 'express';
import { AIController } from '../controllers/aiController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const aiController = new AIController();

router.post('/chat/:projectId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await aiController.chat(req, res, next);
});

router.get('/chat/:projectId/history', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await aiController.getChatHistory(req, res, next);
});

export default router;

