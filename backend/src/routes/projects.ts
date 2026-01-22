import { Router, Response, NextFunction } from 'express';
import { ProjectController } from '../controllers/projectController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const projectController = new ProjectController();

router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await projectController.createProject(req, res, next);
});

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await projectController.getProjects(req, res, next);
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await projectController.getProject(req, res, next);
});

router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await projectController.updateProject(req, res, next);
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await projectController.deleteProject(req, res, next);
});

router.get('/room/:roomId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await projectController.getProjectByRoom(req, res, next);
});

router.post('/:id/tasks', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await projectController.createTask(req, res, next);
});

router.get('/:id/tasks', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await projectController.getTasks(req, res, next);
});

router.put('/:id/tasks/:taskId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await projectController.updateTask(req, res, next);
});

router.delete('/:id/tasks/:taskId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await projectController.deleteTask(req, res, next);
});

export default router;

