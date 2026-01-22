import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export class RecordingService {
  /**
   * Start a new session recording
   */
  async startRecording(projectId: string, sessionName: string, description?: string): Promise<any> {
    const shareToken = uuidv4().substring(0, 8);
    
    return prisma.sessionRecording.create({
      data: {
        projectId,
        sessionName,
        description,
        shareToken,
        events: [],
      },
    });
  }

  /**
   * Stop recording and process events
   */
  async stopRecording(recordingId: string): Promise<any> {
    const recording = await prisma.sessionRecording.findUnique({
      where: { id: recordingId },
    });

    if (!recording) {
      throw new Error('Recording not found');
    }

    const endedAt = new Date();
    const duration = Math.floor((endedAt.getTime() - recording.startedAt.getTime()) / 1000);

    // Process events for playback
    const events = recording.events as any[];
    const playbackData = this.processEventsForPlayback(events);

    return prisma.sessionRecording.update({
      where: { id: recordingId },
      data: {
        endedAt,
        duration,
        playbackData: playbackData as any,
      },
    });
  }

  /**
   * Add event to recording
   */
  async addEvent(recordingId: string, event: any): Promise<void> {
    const recording = await prisma.sessionRecording.findUnique({
      where: { id: recordingId },
    });

    if (!recording) {
      throw new Error('Recording not found');
    }

    const events = recording.events as any[];
    events.push({
      ...event,
      timestamp: new Date().toISOString(),
    });

    await prisma.sessionRecording.update({
      where: { id: recordingId },
      data: {
        events: events as any,
      },
    });
  }

  /**
   * Process events for smooth playback
   */
  private processEventsForPlayback(events: any[]): any {
    // Group events by type and time
    // Add transitions and animations
    // Optimize for playback
    return {
      timeline: events.map((e, index) => ({
        time: index * 100, // 100ms intervals
        event: e,
      })),
      duration: events.length * 100,
      totalEvents: events.length,
    };
  }

  /**
   * Get recording for playback
   */
  async getRecording(shareToken: string): Promise<any> {
    const recording = await prisma.sessionRecording.findUnique({
      where: { shareToken },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!recording) {
      throw new Error('Recording not found');
    }

    // Increment view count
    await prisma.sessionRecording.update({
      where: { id: recording.id },
      data: {
        viewCount: recording.viewCount + 1,
      },
    });

    return recording;
  }

  /**
   * List recordings for a project
   */
  async listRecordings(projectId: string): Promise<any[]> {
    return prisma.sessionRecording.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

