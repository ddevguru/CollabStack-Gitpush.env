import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export const setSocketIO = (io: Server) => {
  ioInstance = io;
};

export const getSocketIO = (): Server | null => {
  return ioInstance;
};

export const emitToProject = (projectId: string, event: string, data: any) => {
  if (!ioInstance) return;
  
  // Get project room ID from projectId
  // For now, we'll emit to all rooms and let clients filter
  ioInstance.emit(event, { projectId, ...data });
};

export const emitToRoom = (roomId: string, event: string, data: any) => {
  if (!ioInstance) return;
  ioInstance.to(roomId).emit(event, data);
};

