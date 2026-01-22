import { Router } from 'express';
import { RunController } from '../controllers/runController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const runController = new RunController();

router.post('/:projectId', async (req: AuthRequest, res, next) => {
  await runController.createRun(req, res, next);
});

router.get('/:projectId', async (req: AuthRequest, res, next) => {
  await runController.getRuns(req, res, next);
});

router.get('/:projectId/:runId', async (req: AuthRequest, res, next) => {
  await runController.getRun(req, res, next);
});

export default router;

