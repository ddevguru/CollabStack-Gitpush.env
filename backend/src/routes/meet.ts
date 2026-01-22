import { Router, Response, NextFunction } from 'express';
import { MeetController } from '../controllers/meetController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const meetController = new MeetController();

router.post('/quick', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await meetController.createQuickMeet(req, res, next);
});

router.post('/schedule', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await meetController.scheduleMeet(req, res, next);
});

router.get('/scheduled', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await meetController.getScheduledMeetings(req, res, next);
});

router.get('/calendar', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await meetController.getCalendarEvents(req, res, next);
});

router.post('/calendar/mark', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await meetController.markDate(req, res, next);
});

router.delete('/calendar/mark', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await meetController.unmarkDate(req, res, next);
});

export default router;

