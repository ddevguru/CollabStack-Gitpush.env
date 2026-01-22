import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socket: Socket | null = null;

export const getSocket = (): Socket | null => {
  if (!socket) {
    const token = useAuthStore.getState().token;
    if (!token) return null;

    // Use environment variable if available, otherwise use relative path
    const apiBaseURL = import.meta.env.VITE_API_URL || window.location.origin;
    const socketURL = apiBaseURL.replace('/api', '') || window.location.origin;

    socket = io(socketURL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

