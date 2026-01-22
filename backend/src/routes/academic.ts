import { Router } from 'express';
import { AcademicController } from '../controllers/academicController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const academicController = new AcademicController();

router.post('/projects/:projectId/exam-mode', async (req: AuthRequest, res, next) => {
  await academicController.enableExamMode(req, res, next);
});

router.delete('/projects/:projectId/exam-mode', async (req: AuthRequest, res, next) => {
  await academicController.disableExamMode(req, res, next);
});

router.post('/projects/:projectId/plagiarism-check', async (req: AuthRequest, res, next) => {
  await academicController.checkPlagiarism(req, res, next);
});

router.get('/projects/:projectId/status', async (req: AuthRequest, res, next) => {
  await academicController.getStatus(req, res, next);
});

export default router;

