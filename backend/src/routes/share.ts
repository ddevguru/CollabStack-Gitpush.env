import { Router } from 'express';
import { ShareController } from '../controllers/shareController.js';
import { AuthRequest, optionalAuth } from '../middleware/auth.js';

const router = Router();
const shareController = new ShareController();

router.post('/create', async (req: AuthRequest, res, next) => {
  await shareController.createShareLink(req, res, next);
});

router.get('/:shortCode', async (req, res, next) => {
  await shareController.getShareLink(req, res, next);
});

router.get('/:shortCode/qr', async (req, res, next) => {
  await shareController.getQRCode(req, res, next);
});

export default router;

