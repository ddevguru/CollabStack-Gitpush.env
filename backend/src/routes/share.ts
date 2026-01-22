import { Router, Request, Response, NextFunction } from 'express';
import { ShareController } from '../controllers/shareController.js';
import { AuthRequest, optionalAuth } from '../middleware/auth.js';

const router = Router();
const shareController = new ShareController();

router.post('/create', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await shareController.createShareLink(req, res, next);
});

router.get('/:shortCode', async (req: Request, res: Response, next: NextFunction) => {
  await shareController.getShareLink(req, res, next);
});

router.get('/:shortCode/qr', async (req: Request, res: Response, next: NextFunction) => {
  await shareController.getQRCode(req, res, next);
});

export default router;

