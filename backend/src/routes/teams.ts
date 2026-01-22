import { Router } from 'express';
import { TeamController } from '../controllers/teamController.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();
const teamController = new TeamController();

router.post('/', async (req: AuthRequest, res, next) => {
  await teamController.createTeam(req, res, next);
});

router.get('/', async (req: AuthRequest, res, next) => {
  await teamController.getMyTeams(req, res, next);
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  await teamController.getTeam(req, res, next);
});

router.put('/:id', async (req: AuthRequest, res, next) => {
  await teamController.updateTeam(req, res, next);
});

router.post('/:id/members', async (req: AuthRequest, res, next) => {
  await teamController.addMember(req, res, next);
});

router.delete('/:id/members/:userId', async (req: AuthRequest, res, next) => {
  await teamController.removeMember(req, res, next);
});

router.get('/:id/members', async (req: AuthRequest, res, next) => {
  await teamController.getMembers(req, res, next);
});

export default router;

