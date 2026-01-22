import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { createError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

export class MeetService {
  private clientId = process.env.GOOGLE_CLIENT_ID;
  private clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  private redirectUri = process.env.GOOGLE_REDIRECT_URI;

  private async getAccessToken(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { googleToken: true, googleRefreshToken: true },
    });

    if (!user?.googleToken) {
      throw createError('Google account not connected. Please connect in Settings.', 400);
    }

    // In production, you should refresh the token if expired
    // For now, we'll use the stored token
    return user.googleToken;
  }

  async createQuickMeet(userId: string, projectId?: string, teamId?: string): Promise<any> {
    try {
      // Generate a Google Meet link
      // Note: Google Meet API doesn't directly support creating instant meetings
      // We'll use the Google Calendar API to create an event with a Meet link
      const accessToken = await this.getAccessToken(userId);

      const now = new Date();
      const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

      const event = {
        summary: projectId ? 'Quick Project Meeting' : teamId ? 'Quick Team Meeting' : 'Quick Meeting',
        description: 'Instant Google Meet session',
        start: {
          dateTime: now.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      };

      const response = await axios.post(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        event,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const meetUrl = response.data.conferenceData?.entryPoints?.[0]?.uri || response.data.hangoutLink;

      // Store meeting in database
      await prisma.sessionEvent.create({
        data: {
          projectId: projectId || 'global',
          type: 'meet',
          data: {
            userId,
            meetUrl,
            eventId: response.data.id,
            startTime: now.toISOString(),
            endTime: endTime.toISOString(),
          } as any,
        },
      });

      return {
        meetUrl,
        eventId: response.data.id,
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
      };
    } catch (error: any) {
      console.error('Error creating quick meet:', error);
      if (error.response?.status === 401) {
        throw createError('Google token expired. Please reconnect your Google account.', 401);
      }
      throw createError(error.response?.data?.error?.message || 'Failed to create Google Meet', 500);
    }
  }

  async scheduleMeet(
    userId: string,
    title: string,
    description: string,
    startTime: string,
    endTime: string,
    attendees: string[],
    projectId?: string,
    teamId?: string
  ): Promise<any> {
    try {
      const accessToken = await this.getAccessToken(userId);

      const event = {
        summary: title,
        description: description || '',
        start: {
          dateTime: startTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees: attendees.map(email => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      };

      const response = await axios.post(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        event,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const meetUrl = response.data.conferenceData?.entryPoints?.[0]?.uri || response.data.hangoutLink;

      // Store meeting in database
      await prisma.sessionEvent.create({
        data: {
          projectId: projectId || 'global',
          type: 'meet',
          data: {
            userId,
            meetUrl,
            eventId: response.data.id,
            title,
            description,
            startTime,
            endTime,
            attendees,
          } as any,
        },
      });

      return {
        id: response.data.id,
        meetUrl,
        title,
        startTime,
        endTime,
        attendees,
      };
    } catch (error: any) {
      console.error('Error scheduling meet:', error);
      if (error.response?.status === 401) {
        throw createError('Google token expired. Please reconnect your Google account.', 401);
      }
      throw createError(error.response?.data?.error?.message || 'Failed to schedule meeting', 500);
    }
  }

  async getScheduledMeetings(
    userId: string,
    startDate?: string,
    endDate?: string,
    projectId?: string,
    teamId?: string
  ): Promise<any[]> {
    try {
      const where: any = {
        type: 'meet',
      };

      if (projectId) {
        where.projectId = projectId;
      }

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) {
          where.timestamp.gte = new Date(startDate);
        }
        if (endDate) {
          where.timestamp.lte = new Date(endDate);
        }
      }

      const events = await prisma.sessionEvent.findMany({
        where,
        orderBy: {
          timestamp: 'desc',
        },
        take: 50,
      });

      // Filter by userId from data field
      const userEvents = events.filter(event => {
        const data = event.data as any;
        return data?.userId === userId;
      });

      return userEvents.map(event => {
        const data = event.data as any;
        return {
          id: event.id,
          title: data?.title || 'Meeting',
          description: data?.description,
          meetUrl: data?.meetUrl,
          startTime: data?.startTime || event.timestamp.toISOString(),
          endTime: data?.endTime,
          attendees: data?.attendees || [],
        };
      });
    } catch (error: any) {
      console.error('Error getting scheduled meetings:', error);
      return [];
    }
  }

  async getCalendarEvents(
    userId: string,
    startDate: string,
    endDate: string,
    projectId?: string,
    teamId?: string
  ): Promise<any[]> {
    try {
      const accessToken = await this.getAccessToken(userId);

      const timeMin = new Date(startDate).toISOString();
      const timeMax = new Date(endDate).toISOString();

      const response = await axios.get(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          params: {
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const events = response.data.items || [];

      // Get database events (markings and reminders)
      const dbEvents = await prisma.sessionEvent.findMany({
        where: {
          timestamp: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
          type: {
            in: ['calendar_mark', 'calendar_reminder', 'meet'],
          },
          ...(projectId ? { projectId } : {}),
        },
      });

      // Filter by userId from data field
      const userDbEvents = dbEvents.filter(event => {
        const data = event.data as any;
        return data?.userId === userId;
      });

      // Combine Google Calendar events and database events
      const googleEvents = events
        .filter((event: any) => event.conferenceData || event.hangoutLink || event.summary === 'Marked' || event.summary === 'Reminder' || event.summary?.includes('Reminder'))
        .map((event: any) => ({
          id: event.id,
          title: event.summary || 'Meeting',
          description: event.description,
          startTime: event.start.dateTime || event.start.date,
          endTime: event.end.dateTime || event.end.date,
          meetUrl: event.conferenceData?.entryPoints?.[0]?.uri || event.hangoutLink,
          attendees: event.attendees?.map((a: any) => a.email) || [],
          type: event.summary === 'Marked' ? 'marking' : event.summary === 'Reminder' || event.summary?.includes('Reminder') ? 'reminder' : 'meeting',
          note: event.description,
        }));

      const databaseEvents = userDbEvents.map((event: any) => {
        const data = event.data as any;
        return {
          id: event.id,
          title: data.title || (event.type === 'calendar_mark' ? 'Marked' : 'Reminder'),
          description: data.note || '',
          startTime: data.startTime || event.timestamp.toISOString(),
          endTime: data.endTime || event.timestamp.toISOString(),
          meetUrl: data.meetUrl,
          attendees: [],
          type: event.type === 'calendar_mark' ? 'marking' : event.type === 'calendar_reminder' ? 'reminder' : 'meeting',
          note: data.note,
        };
      });

      // Merge and deduplicate
      const allEvents = [...googleEvents, ...databaseEvents];
      const uniqueEvents = allEvents.filter((event, index, self) =>
        index === self.findIndex((e) => e.id === event.id)
      );

      return uniqueEvents;
    } catch (error: any) {
      console.error('Error getting calendar events:', error);
      // Fallback to database events
      const dbEvents = await prisma.sessionEvent.findMany({
        where: {
          timestamp: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
          type: {
            in: ['calendar_mark', 'calendar_reminder', 'meet'],
          },
          ...(projectId ? { projectId } : {}),
        },
      });

      // Filter by userId from data field
      const userDbEvents = dbEvents.filter(event => {
        const data = event.data as any;
        return data?.userId === userId;
      });

      return userDbEvents.map((event: any) => {
        const data = event.data as any;
        return {
          id: event.id,
          title: data.title || (event.type === 'calendar_mark' ? 'Marked' : 'Reminder'),
          description: data.note || '',
          startTime: data.startTime || event.timestamp.toISOString(),
          endTime: data.endTime || event.timestamp.toISOString(),
          meetUrl: data.meetUrl,
          attendees: [],
          type: event.type === 'calendar_mark' ? 'marking' : event.type === 'calendar_reminder' ? 'reminder' : 'meeting',
          note: data.note,
        };
      });
    }
  }

  async markDate(userId: string, date: string, type: string, projectId?: string, teamId?: string, title?: string, note?: string, startTime?: string, endTime?: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const dateObj = new Date(date);
      
      let eventStartTime: Date;
      let eventEndTime: Date;
      
      if (startTime && endTime) {
        eventStartTime = new Date(startTime);
        eventEndTime = new Date(endTime);
      } else {
        eventStartTime = new Date(dateObj.setHours(0, 0, 0, 0));
        eventEndTime = new Date(dateObj.setHours(23, 59, 59, 999));
      }

      const event = {
        summary: title || (type === 'marking' ? 'Marked' : 'Reminder'),
        description: note || (type === 'marking' ? 'Important date marking' : 'Reminder'),
        start: {
          dateTime: eventStartTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: eventEndTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        colorId: type === 'marking' ? '10' : '9', // Red for marking, Blue for reminder
      };

      const response = await axios.post(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        event,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Also store in database
      await prisma.sessionEvent.create({
        data: {
          projectId: projectId || 'global',
          type: type === 'marking' ? 'calendar_mark' : 'calendar_reminder',
          data: {
            userId,
            eventId: response.data.id,
            title: event.summary,
            note: note,
            type: type,
            startTime: eventStartTime.toISOString(),
            endTime: eventEndTime.toISOString(),
          } as any,
        },
      });

      return {
        id: response.data.id,
        title: response.data.summary,
        startTime: response.data.start.dateTime || response.data.start.date,
        endTime: response.data.end.dateTime || response.data.end.date,
        type: type,
        note: note,
      };
    } catch (error: any) {
      console.error('Error marking date:', error);
      if (error.response?.status === 401) {
        throw createError('Google token expired. Please reconnect your Google account.', 401);
      }
      throw createError('Failed to mark date', 500);
    }
  }

  async unmarkDate(userId: string, date: string, projectId?: string, teamId?: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const dateStr = new Date(date).toISOString().split('T')[0];

      // Get events for the date
      const timeMin = new Date(dateStr).toISOString();
      const timeMax = new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000).toISOString();

      const response = await axios.get(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          params: {
            timeMin,
            timeMax,
            singleEvents: true,
            q: 'Marked',
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const events = response.data.items || [];
      const markingEvents = events.filter((e: any) => e.summary === 'Marked');

      // Delete all marking events for this date
      for (const event of markingEvents) {
        await axios.delete(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
      }
    } catch (error: any) {
      console.error('Error unmarking date:', error);
      throw createError('Failed to unmark date', 500);
    }
  }
}

