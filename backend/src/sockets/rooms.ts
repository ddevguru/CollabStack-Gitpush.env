import { Server } from 'socket.io';
import { Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CursorPosition {
  line: number;
  column: number;
}

interface EditOperation {
  type: 'insert' | 'delete';
  position: number;
  text?: string;
  length?: number;
}

export const setupRoomHandlers = (io: Server, socket: Socket) => {
  // Join project room
  socket.on('room:join', async (data: { projectId: string; roomId: string }) => {
    try {
      const { projectId, roomId } = data;
      const userId = (socket as any).userId;

      // Verify access
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          roomId,
          ownerTeam: {
            OR: [
              { leaderId: userId },
              { members: { some: { userId } } },
            ],
          },
        },
      });

      if (!project) {
        socket.emit('error', { message: 'Project not found or access denied' });
        return;
      }

      // Join room
      socket.join(roomId);

      // Create or update session
      await prisma.session.upsert({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
        update: {
          lastActive: new Date(),
        },
        create: {
          projectId,
          userId,
          joinedAt: new Date(),
          lastActive: new Date(),
        },
      });

      // Notify others
      socket.to(roomId).emit('user:joined', {
        userId,
        userName: (socket as any).user.name,
      });

      // Send current users in room
      const sessions = await prisma.session.findMany({
        where: { projectId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      socket.emit('room:users', {
        users: sessions.map(s => ({
          userId: s.user.id,
          userName: s.user.name,
          avatar: s.user.avatar,
          activeFile: s.activeFile,
          cursorPos: s.cursorPos,
        })),
      });
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  // Leave room
  socket.on('room:leave', async (data: { roomId: string }) => {
    const { roomId } = data;
    const userId = (socket as any).userId;

    socket.leave(roomId);

    // Delete session
    await prisma.session.deleteMany({
      where: {
        userId,
        project: { roomId },
      },
    });

    // Notify others
    socket.to(roomId).emit('user:left', { userId });
  });

  // File operations
  socket.on('file:open', async (data: { roomId: string; projectId: string; filePath: string }) => {
    const { roomId, projectId, filePath } = data;
    const userId = (socket as any).userId;

    // Update session
    await prisma.session.updateMany({
      where: {
        projectId,
        userId,
      },
      data: {
        activeFile: filePath,
      },
    });

    // Notify others
    socket.to(roomId).emit('file:opened', {
      userId,
      filePath,
    });
  });

  // Cursor position
  socket.on('cursor:update', async (data: { roomId: string; projectId: string; filePath: string; position: CursorPosition }) => {
    const { roomId, projectId, filePath, position } = data;
    const userId = (socket as any).userId;

    // Update session
    await prisma.session.updateMany({
      where: {
        projectId,
        userId,
      },
      data: {
        activeFile: filePath,
        cursorPos: position as any,
      },
    });

    // Broadcast to others
    socket.to(roomId).emit('cursor:updated', {
      userId,
      filePath,
      position,
      userName: (socket as any).user.name,
    });
  });

  // Text edits (using Operational Transform)
  socket.on('edit', async (data: { roomId: string; projectId: string; fileId: string; filePath: string; operation: EditOperation; version: number }) => {
    const { roomId, projectId, fileId, filePath, operation, version } = data;
    const userId = (socket as any).userId;

    try {
      // Get current file
      const file = await prisma.file.findUnique({
        where: { id: fileId },
      });

      if (!file || file.projectId !== projectId) {
        socket.emit('error', { message: 'File not found' });
        return;
      }

      // Apply operation (simplified - in production use proper OT/CRDT)
      let newContent = file.content;
      if (operation.type === 'insert' && operation.text) {
        newContent = newContent.slice(0, operation.position) + operation.text + newContent.slice(operation.position);
      } else if (operation.type === 'delete' && operation.length) {
        newContent = newContent.slice(0, operation.position) + newContent.slice(operation.position + operation.length);
      }

      // Update file
      await prisma.file.update({
        where: { id: fileId },
        data: {
          content: newContent,
        },
      });

      // Broadcast to others in room
      socket.to(roomId).emit('edit', {
        userId,
        fileId,
        filePath,
        operation,
        version: version + 1,
        userName: (socket as any).user.name,
      });

      // Log event
      await prisma.sessionEvent.create({
        data: {
          projectId,
          type: 'edit',
          data: {
            userId,
            fileId,
            filePath,
            operation,
          } as any,
        },
      });
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  // Chat messages
  socket.on('chat:message', async (data: { roomId: string; projectId: string; message: string }) => {
    const { roomId, projectId, message } = data;
    const userId = (socket as any).userId;

    // Broadcast to all in room including sender
    io.to(roomId).emit('chat:message', {
      userId,
      userName: (socket as any).user.name,
      avatar: (socket as any).user.avatar,
      message,
      timestamp: new Date().toISOString(),
    });

    // Log event
    await prisma.sessionEvent.create({
      data: {
        projectId,
        type: 'chat',
        data: {
          userId,
          message,
        } as any,
      },
    });
  });

  // Terminal output handler (for GitHub commands, etc.)
  socket.on('terminal:output', (data: { projectId: string; type: string; command: string; output: string }) => {
    const { projectId, type, command, output } = data;
    const userId = (socket as any).userId;
    
    // Get project room ID
    prisma.project.findUnique({
      where: { id: projectId },
      select: { roomId: true },
    }).then((project) => {
      if (project) {
        // Broadcast to all clients in the project room
        io.to(project.roomId).emit('terminal:output', {
          projectId,
          type,
          command,
          output,
        });
      }
    }).catch(() => {
      // Ignore errors
    });
  });

  // Run request
  socket.on('run:request', async (data: { roomId: string; projectId: string; language: string; code: string; stdin?: string }) => {
    const { roomId, projectId, language, code, stdin } = data;
    const userId = (socket as any).userId;

    // Create run record
    const run = await prisma.run.create({
      data: {
        projectId,
        userId,
        language,
        code,
        stdin: stdin || '',
        status: 'PENDING' as any,
      },
    });

    // Broadcast run started
    io.to(roomId).emit('run:started', {
      runId: run.id,
      userId,
      userName: (socket as any).user.name,
      language,
    });

    // Execute code (simplified - would use compile service)
    // In production, this would be handled by a separate service
    setTimeout(async () => {
      const updated = await prisma.run.update({
        where: { id: run.id },
        data: {
          status: 'SUCCESS' as any,
          output: 'Code executed successfully',
        },
      });

      io.to(roomId).emit('run:completed', {
        runId: run.id,
        run: updated,
      });
    }, 2000);
  });
};

