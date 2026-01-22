import { Router } from 'express';
import { TemplateController } from '../controllers/templateController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const templateController = new TemplateController();

router.get('/', async (req, res, next) => {
  await templateController.getTemplates(req, res, next);
});

router.post('/', async (req: AuthRequest, res, next) => {
  await templateController.createTemplate(req, res, next);
});

router.post('/:templateId/use', async (req, res, next) => {
  await templateController.useTemplate(req, res, next);
});

router.post('/:templateId/rate', async (req: AuthRequest, res, next) => {
  await templateController.rateTemplate(req, res, next);
});

router.get('/snippets', async (req: AuthRequest, res, next) => {
  await templateController.getSnippets(req, res, next);
});

router.post('/snippets', async (req: AuthRequest, res, next) => {
  await templateController.createSnippet(req, res, next);
});

router.post('/snippets/:snippetId/favorite', async (req: AuthRequest, res, next) => {
  await templateController.toggleFavorite(req, res, next);
});

export default router;

