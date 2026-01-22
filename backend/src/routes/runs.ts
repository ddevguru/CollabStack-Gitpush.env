import { Router, Response, NextFunction } from 'express';
import { RunController } from '../controllers/runController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const runController = new RunController();

router.post('/:projectId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await runController.createRun(req, res, next);
});

router.get('/:projectId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await runController.getRuns(req, res, next);
});

router.get('/:projectId/:runId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await runController.getRun(req, res, next);
});

export default router;

