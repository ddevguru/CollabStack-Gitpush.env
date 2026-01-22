import { Router, Request, Response, NextFunction } from 'express';
import { TemplateController } from '../controllers/templateController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const templateController = new TemplateController();

router.get('/', async (req: any, res: Response, next: NextFunction) => {
  await templateController.getTemplates(req, res, next);
});

router.post('/', async (req: any, res: Response, next: NextFunction) => {
  await templateController.createTemplate(req, res, next);
});


router.post('/:templateId/use', async (req: any, res: Response, next: NextFunction) => {
  await templateController.useTemplate(req, res, next);
});

router.post('/:templateId/rate', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await templateController.rateTemplate(req, res, next);
});

router.get('/snippets', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await templateController.getSnippets(req, res, next);
});

router.post('/snippets', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await templateController.createSnippet(req, res, next);
});

router.post('/snippets/:snippetId/favorite', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await templateController.toggleFavorite(req, res, next);
});

export default router;

