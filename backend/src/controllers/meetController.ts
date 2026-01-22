import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { MeetService } from '../services/meetService.js';

const meetService = new MeetService();

export class MeetController {
  async createQuickMeet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId, teamId } = req.body;

      const result = await meetService.createQuickMeet(req.userId, projectId, teamId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async scheduleMeet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { title, description, startTime, endTime, attendees, projectId, teamId } = req.body;

      if (!title || !startTime || !endTime) {
        throw createError('Title, start time, and end time are required', 400);
      }

      const result = await meetService.scheduleMeet(
        req.userId,
        title,
        description || '',
        startTime,
        endTime,
        attendees || [],
        projectId,
        teamId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getScheduledMeetings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId, teamId } = req.query;

      const meetings = await meetService.getScheduledMeetings(
        req.userId,
        undefined,
        undefined,
        projectId as string,
        teamId as string
      );

      res.json({
        success: true,
        data: { meetings },
      });
    } catch (error) {
      next(error);
    }
  }

  async getCalendarEvents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { startDate, endDate, projectId, teamId } = req.query;

      if (!startDate || !endDate) {
        throw createError('Start date and end date are required', 400);
      }

      try {
        const events = await meetService.getCalendarEvents(
          req.userId,
          startDate as string,
          endDate as string,
          projectId as string,
          teamId as string
        );

        res.json({
          success: true,
          data: { events },
        });
      } catch (error: any) {
        // If Google account not connected, return empty events instead of error
        if (error.message?.includes('Google account not connected')) {
          res.json({
            success: true,
            data: { events: [] },
          });
        } else {
          throw error;
        }
      }
    } catch (error) {
      next(error);
    }
  }

  async markDate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { date, projectId, teamId, type = 'marking', title, note, startTime, endTime } = req.body;

      if (!date) {
        throw createError('Date is required', 400);
      }

      try {
        const result = await meetService.markDate(
          req.userId,
          date,
          type,
          projectId,
          teamId,
          title,
          note,
          startTime,
          endTime
        );

        res.json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        // If Google account not connected, return helpful error
        if (error.message?.includes('Google account not connected')) {
          throw createError('Google account not connected. Please connect your Google account in Settings to mark dates.', 400);
        }
        throw error;
      }
    } catch (error) {
      next(error);
    }
  }

  async unmarkDate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { date, projectId, teamId } = req.query;

      if (!date) {
        throw createError('Date is required', 400);
      }

      await meetService.unmarkDate(
        req.userId,
        date as string,
        projectId as string,
        teamId as string
      );

      res.json({
        success: true,
      });
    } catch (error) {
      next(error);
    }
  }
}

