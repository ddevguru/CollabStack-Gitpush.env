import { Router } from 'express';
import { ComputeController } from '../controllers/computeController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const computeController = new ComputeController();

router.post('/jobs', async (req: AuthRequest, res, next) => {
  await computeController.createJob(req, res, next);
});

router.get('/jobs', async (req: AuthRequest, res, next) => {
  await computeController.listJobs(req, res, next);
});

router.get('/jobs/:jobId', async (req: AuthRequest, res, next) => {
  await computeController.getJobStatus(req, res, next);
});

router.get('/credits', async (req: AuthRequest, res, next) => {
  await computeController.getCredits(req, res, next);
});

router.post('/schedule', async (req: AuthRequest, res, next) => {
  await computeController.scheduleJob(req, res, next);
});

router.get('/schedule/available', async (req: AuthRequest, res, next) => {
  await computeController.getAvailableSlots(req, res, next);
});

export default router;

