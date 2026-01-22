import { Express } from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import teamRoutes from './teams.js';
import projectRoutes from './projects.js';
import fileRoutes from './files.js';
import runRoutes from './runs.js';
import githubRoutes from './github.js';
import driveRoutes from './drive.js';
import computeRoutes from './compute.js';
import academicRoutes from './academic.js';
import platformRoutes from './platform.js';
import recordingRoutes from './recording.js';
import templateRoutes from './templates.js';
import metricsRoutes from './metrics.js';
import shareRoutes from './share.js';
import reviewRoutes from './review.js';
import chatRoutes from './chat.js';
import meetRoutes from './meet.js';
import aiRoutes from './ai.js';
import designRoutes from './designs.js';
import extensionRoutes from './extensions.js';
import { authenticate } from '../middleware/auth.js';

export const setupRoutes = (app: Express) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/users', authenticate, userRoutes);
  app.use('/api/teams', authenticate, teamRoutes);
  app.use('/api/projects', authenticate, projectRoutes);
  app.use('/api/files', authenticate, fileRoutes);
  app.use('/api/runs', authenticate, runRoutes);
  app.use('/api/github', authenticate, githubRoutes);
  app.use('/api/drive', authenticate, driveRoutes);
  app.use('/api/compute', authenticate, computeRoutes);
  app.use('/api/academic', authenticate, academicRoutes);
  app.use('/api/platform', authenticate, platformRoutes);
  app.use('/api/metrics', authenticate, metricsRoutes);
  app.use('/api/review', authenticate, reviewRoutes);
  app.use('/api/chat', authenticate, chatRoutes);
  app.use('/api/meet', authenticate, meetRoutes);
  app.use('/api/ai', authenticate, aiRoutes);
  app.use('/api/designs', authenticate, designRoutes);
  app.use('/api/extensions', authenticate, extensionRoutes);
  app.use('/api/share', shareRoutes); // Share links can be public
  app.use('/api/templates', templateRoutes); // Templates can be public
  app.use('/api/recording', authenticate, recordingRoutes);
};

