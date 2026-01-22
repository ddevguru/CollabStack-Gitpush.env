import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

export const authenticateSocket = async (socket: Socket, next: any) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(new Error('JWT_SECRET not configured'));
    }

    const decoded = jwt.verify(token, secret) as { userId: string; email: string; name: string };
    (socket as any).userId = decoded.userId;
    (socket as any).user = decoded;

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new Error('Invalid or expired token'));
    }
    next(error);
  }
};

