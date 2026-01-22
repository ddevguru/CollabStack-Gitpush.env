import { Router } from 'express';
import { MetricsController } from '../controllers/metricsController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const metricsController = new MetricsController();

router.post('/analyze', async (req: AuthRequest, res, next) => {
  await metricsController.analyzeCode(req, res, next);
});

router.get('/project/:projectId', async (req: AuthRequest, res, next) => {
  await metricsController.getProjectMetrics(req, res, next);
});

export default router;

