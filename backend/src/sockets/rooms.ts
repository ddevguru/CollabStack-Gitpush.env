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

// WebRTC type definitions
interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

interface RTCIceCandidateInit {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
  usernameFragment?: string | null;
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

      const usersList = sessions.map((s: { user: { id: string; name: string; avatar: string | null }; activeFile: string | null; cursorPos: unknown }) => ({
        userId: s.user.id,
        userName: s.user.name,
        avatar: s.user.avatar,
        activeFile: s.activeFile,
        cursorPos: s.cursorPos,
      }));

      // Send to the user who just joined
      socket.emit('room:users', {
        users: usersList,
      });

      // Also broadcast updated users list to all users in room
      io.to(roomId).emit('room:users', {
        users: usersList,
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
      userName: (socket as any).user.name,
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

  // Chat messages with command support
  socket.on('chat:message', async (data: { roomId: string; projectId: string; message: string; type?: 'text' | 'voice_note' }) => {
    const { roomId, projectId, message, type = 'text' } = data;
    const userId = (socket as any).userId;

    // Check if message is a command (starts with /)
    if (message.startsWith('/') && type === 'text') {
      const commandParts = message.slice(1).split(' ');
      const command = commandParts[0].toLowerCase();
      const args = commandParts.slice(1);

      // Handle commands
      switch (command) {
        case 'help':
          socket.emit('chat:message', {
            userId: 'system',
            userName: 'System',
            avatar: null,
            message: 'Available commands:\n/help - Show this help message\n/clear - Clear chat history\n/gif [query] - Search for a GIF\n/users - List online users\n/me [action] - Send an action message\n/tts [text] - Text to speech\n/weather [city] - Get weather info',
            timestamp: new Date().toISOString(),
            isCommand: true,
          });
          return;

        case 'clear':
          socket.emit('chat:clear', {});
          socket.emit('chat:message', {
            userId: 'system',
            userName: 'System',
            avatar: null,
            message: 'Chat cleared',
            timestamp: new Date().toISOString(),
            isCommand: true,
          });
          return;

        case 'users':
          const sessions = await prisma.session.findMany({
            where: { projectId },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
            },
          });
          const userList = sessions.map((s: { user: { name: string } }) => s.user.name).join(', ');
          socket.emit('chat:message', {
            userId: 'system',
            userName: 'System',
            avatar: null,
            message: `Online users: ${userList}`,
            timestamp: new Date().toISOString(),
            isCommand: true,
          });
          return;

        case 'me':
          const action = args.join(' ');
          if (action) {
            io.to(roomId).emit('chat:message', {
              userId,
              userName: (socket as any).user.name,
              avatar: (socket as any).user.avatar,
              message: `* ${(socket as any).user.name} ${action}`,
              timestamp: new Date().toISOString(),
              isAction: true,
            });
          }
          return;

        case 'gif':
          const query = args.join(' ');
          if (query) {
            // In production, integrate with Giphy API
            io.to(roomId).emit('chat:message', {
              userId,
              userName: (socket as any).user.name,
              avatar: (socket as any).user.avatar,
              message: `🔍 Searching for GIF: ${query}`,
              timestamp: new Date().toISOString(),
              gifQuery: query,
            });
          }
          return;

        default:
          socket.emit('chat:message', {
            userId: 'system',
            userName: 'System',
            avatar: null,
            message: `Unknown command: /${command}. Type /help for available commands.`,
            timestamp: new Date().toISOString(),
            isCommand: true,
          });
          return;
      }
    }

    // Broadcast to all in room including sender
    io.to(roomId).emit('chat:message', {
      userId,
      userName: (socket as any).user.name,
      avatar: (socket as any).user.avatar,
      message,
      timestamp: new Date().toISOString(),
      type,
    });

    // Log event
    await prisma.sessionEvent.create({
      data: {
        projectId,
        type: type === 'voice_note' ? 'voice_note' : 'chat',
        data: {
          userId,
          message,
          type,
        } as any,
      },
    });
  });

  // Voice call WebRTC signaling
  socket.on('voice:call:offer', (data: { roomId: string; offer: RTCSessionDescriptionInit; targetUserId?: string }) => {
    const { roomId, offer, targetUserId } = data;
    const userId = (socket as any).userId;

    if (targetUserId) {
      // Direct call to specific user
      socket.to(roomId).emit('voice:call:offer', {
        fromUserId: userId,
        fromUserName: (socket as any).user.name,
        offer,
      });
    } else {
      // Broadcast to all in room
      socket.to(roomId).emit('voice:call:offer', {
        fromUserId: userId,
        fromUserName: (socket as any).user.name,
        offer,
      });
    }
  });

  socket.on('voice:call:answer', (data: { roomId: string; answer: RTCSessionDescriptionInit; targetUserId: string }) => {
    const { roomId, answer, targetUserId } = data;
    const userId = (socket as any).userId;

    socket.to(roomId).emit('voice:call:answer', {
      fromUserId: userId,
      answer,
      targetUserId,
    });
  });

  socket.on('voice:call:ice-candidate', (data: { roomId: string; candidate: RTCIceCandidateInit; targetUserId?: string }) => {
    const { roomId, candidate, targetUserId } = data;
    const userId = (socket as any).userId;

    socket.to(roomId).emit('voice:call:ice-candidate', {
      fromUserId: userId,
      candidate,
      targetUserId,
    });
  });

  socket.on('voice:call:end', (data: { roomId: string }) => {
    const { roomId } = data;
    const userId = (socket as any).userId;

    socket.to(roomId).emit('voice:call:end', {
      fromUserId: userId,
    });
  });

  // Voice note upload
  socket.on('voice:note:upload', async (data: { roomId: string; projectId: string; audioData: string; duration: number }) => {
    const { roomId, projectId, audioData, duration } = data;
    const userId = (socket as any).userId;

    // In production, save audio file to storage (S3, etc.)
    // For now, broadcast the audio data
    io.to(roomId).emit('voice:note:received', {
      userId,
      userName: (socket as any).user.name,
      avatar: (socket as any).user.avatar,
      audioData,
      duration,
      timestamp: new Date().toISOString(),
    });

    // Log event
    await prisma.sessionEvent.create({
      data: {
        projectId,
        type: 'voice_note',
        data: {
          userId,
          duration,
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
    }).then((project: { roomId: string } | null) => {
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

    // Simulate region selection (in production, use actual cluster selection)
    const regions = ['Mumbai Cloud', 'US East', 'EU West', 'Singapore'];
    const clusters = ['GPU Cluster #1', 'GPU Cluster #2', 'GPU Cluster #3'];
    const selectedRegion = regions[Math.floor(Math.random() * regions.length)];
    const selectedCluster = clusters[Math.floor(Math.random() * clusters.length)];

    // Broadcast run started with execution metrics
    io.to(roomId).emit('run:started', {
      runId: run.id,
      userId,
      userName: (socket as any).user.name,
      language,
      region: selectedRegion,
      cluster: selectedCluster,
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

  // Design collaboration handlers
  socket.on('design:join', async (data: { projectId: string; designId: string }) => {
    const { projectId, designId } = data;
    const userId = (socket as any).userId;

    // Verify access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
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

    // Join design room
    const designRoom = `design:${designId}`;
    socket.join(designRoom);

    // Notify others
    socket.to(designRoom).emit('design:user:joined', {
      userId,
      userName: (socket as any).user.name,
    });

    // Send current design state
    try {
      const design = await prisma.design.findUnique({
        where: { id: designId },
      });

      if (design) {
        socket.emit('design:state', {
          designId,
          shapes: JSON.parse(design.data || '[]'),
        });
      }
    } catch (error) {
      console.error('Error loading design:', error);
    }
  });

  socket.on('design:leave', (data: { designId: string }) => {
    const { designId } = data;
    const userId = (socket as any).userId;
    const designRoom = `design:${designId}`;

    socket.leave(designRoom);
    socket.to(designRoom).emit('design:user:left', { userId });
  });

  socket.on('design:shape:add', async (data: { designId: string; projectId: string; shape: any }) => {
    const { designId, projectId, shape } = data;
    const userId = (socket as any).userId;
    const designRoom = `design:${designId}`;

    // Update design in database
    try {
      const design = await prisma.design.findUnique({
        where: { id: designId },
      });

      if (design) {
        const shapes = JSON.parse(design.data || '[]');
        shapes.push(shape);

        await prisma.design.update({
          where: { id: designId },
          data: { data: JSON.stringify(shapes) },
        });

        // Broadcast to all in design room
        io.to(designRoom).emit('design:shape:added', {
          shape,
          userId,
          userName: (socket as any).user.name,
        });
      }
    } catch (error) {
      console.error('Error adding shape:', error);
    }
  });

  socket.on('design:shape:update', async (data: { designId: string; shapeId: string; updates: any }) => {
    const { designId, shapeId, updates } = data;
    const userId = (socket as any).userId;
    const designRoom = `design:${designId}`;

    try {
      const design = await prisma.design.findUnique({
        where: { id: designId },
      });

      if (design) {
        const shapes = JSON.parse(design.data || '[]');
        const index = shapes.findIndex((s: any) => s.id === shapeId);
        
        if (index !== -1) {
          shapes[index] = { ...shapes[index], ...updates };

          await prisma.design.update({
            where: { id: designId },
            data: { data: JSON.stringify(shapes) },
          });

          // Broadcast update
          io.to(designRoom).emit('design:shape:updated', {
            shapeId,
            updates,
            userId,
          });
        }
      }
    } catch (error) {
      console.error('Error updating shape:', error);
    }
  });

  socket.on('design:shape:delete', async (data: { designId: string; shapeId: string }) => {
    const { designId, shapeId } = data;
    const userId = (socket as any).userId;
    const designRoom = `design:${designId}`;

    try {
      const design = await prisma.design.findUnique({
        where: { id: designId },
      });

      if (design) {
        const shapes = JSON.parse(design.data || '[]').filter((s: any) => s.id !== shapeId);

        await prisma.design.update({
          where: { id: designId },
          data: { data: JSON.stringify(shapes) },
        });

        // Broadcast deletion
        io.to(designRoom).emit('design:shape:deleted', {
          shapeId,
          userId,
        });
      }
    } catch (error) {
      console.error('Error deleting shape:', error);
    }
  });

  socket.on('design:cursor:update', (data: { designId: string; x: number; y: number }) => {
    const { designId, x, y } = data;
    const userId = (socket as any).userId;
    const designRoom = `design:${designId}`;

    // Broadcast cursor position
    socket.to(designRoom).emit('design:cursor:updated', {
      userId,
      userName: (socket as any).user.name,
      x,
      y,
    });
  });
};

