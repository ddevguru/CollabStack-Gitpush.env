import { Router } from 'express';
import { RecordingController } from '../controllers/recordingController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const recordingController = new RecordingController();

router.post('/start', async (req: AuthRequest, res, next) => {
  await recordingController.startRecording(req, res, next);
});

router.post('/stop/:recordingId', async (req: AuthRequest, res, next) => {
  await recordingController.stopRecording(req, res, next);
});

router.get('/project/:projectId', async (req: AuthRequest, res, next) => {
  await recordingController.listRecordings(req, res, next);
});

router.get('/play/:shareToken', async (req, res, next) => {
  await recordingController.getRecording(req, res, next);
});

export default router;

