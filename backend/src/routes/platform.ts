import { Router, Response, NextFunction } from 'express';
import { PlatformController } from '../controllers/platformController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const platformController = new PlatformController();

router.post('/execute', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await platformController.execute(req, res, next);
});

router.get('/platforms/:projectType', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await platformController.getPlatforms(req, res, next);
});

export default router;

