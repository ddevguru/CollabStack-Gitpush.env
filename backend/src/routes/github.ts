import { Router, Request, Response, NextFunction } from 'express';
import { GitHubController } from '../controllers/githubController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const githubController = new GitHubController();

router.post('/connect', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await githubController.connectAccount(req, res, next);
});

// OAuth callback endpoint (for frontend redirect)
router.get('/callback', async (req: Request, res: Response, next: NextFunction) => {
  // This will be handled by frontend OAuthCallback component
  res.redirect(`/auth/github/callback?code=${req.query.code || ''}`);
});

router.post('/projects/:projectId/repo', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await githubController.createRepo(req, res, next);
});

router.post('/projects/:projectId/sync', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await githubController.syncProject(req, res, next);
});

router.post('/projects/:projectId/push', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await githubController.pushToBranch(req, res, next);
});

router.get('/projects/:projectId/branches', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await githubController.getBranches(req, res, next);
});

router.post('/projects/:projectId/branches/:branchName/push', async (req: AuthRequest, res: Response, next: NextFunction) => {
  await githubController.pushToSpecificBranch(req, res, next);
});

export default router;

