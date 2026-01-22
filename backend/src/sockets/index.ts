import { Server } from 'socket.io';
import { authenticateSocket } from './auth.js';
import { setupRoomHandlers } from './rooms.js';

export const setupSocketIO = (io: Server) => {
  // Authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket: any) => {
    console.log(`User connected: ${socket.userId}`);

    // Setup room handlers
    setupRoomHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });
};

