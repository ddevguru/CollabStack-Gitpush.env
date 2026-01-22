import { Router, Response, NextFunction } from 'express';
import { FileController } from '../controllers/fileController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const fileController = new FileController();

router.post('/:projectId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await fileController.createFile(req, res, next);
});

router.get('/:projectId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await fileController.getFiles(req, res, next);
});

router.get('/:projectId/:fileId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await fileController.getFile(req, res, next);
});

router.put('/:projectId/:fileId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await fileController.updateFile(req, res, next);
});

router.delete('/:projectId/:fileId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await fileController.deleteFile(req, res, next);
});

export default router;

