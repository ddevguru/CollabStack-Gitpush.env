import { Router, Response, NextFunction } from 'express';
import { ExtensionController } from '../controllers/extensionController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const extensionController = new ExtensionController();

router.get('/marketplace', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await extensionController.getMarketplace(req, res, next);
});

router.get('/projects/:projectId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await extensionController.getProjectExtensions(req, res, next);
});

router.post('/projects/:projectId/install', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await extensionController.installExtension(req, res, next);
});

router.delete('/projects/:projectId/:extensionId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await extensionController.uninstallExtension(req, res, next);
});

export default router;

