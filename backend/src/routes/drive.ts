import { Router } from 'express';
import { DriveController } from '../controllers/driveController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const driveController = new DriveController();

router.post('/connect', async (req: AuthRequest, res, next) => {
  await driveController.connectAccount(req, res, next);
});

router.post('/projects/:projectId/folder', async (req: AuthRequest, res, next) => {
  await driveController.createFolder(req, res, next);
});

router.post('/projects/:projectId/sync', async (req: AuthRequest, res, next) => {
  await driveController.syncProject(req, res, next);
});

router.get('/projects/:projectId/export', async (req: AuthRequest, res, next) => {
  await driveController.exportProject(req, res, next);
});

export default router;

