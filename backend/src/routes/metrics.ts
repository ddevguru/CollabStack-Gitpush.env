import { Router, Response, NextFunction } from 'express';
import { MetricsController } from '../controllers/metricsController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const metricsController = new MetricsController();

router.post('/analyze', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await metricsController.analyzeCode(req, res, next);
});

router.get('/project/:projectId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await metricsController.getProjectMetrics(req, res, next);
});

export default router;

