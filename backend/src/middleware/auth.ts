import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createError } from './errorHandler.js';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      console.warn('Authentication failed: No token provided', {
        path: req.path,
        method: req.method,
        hasAuthHeader: !!authHeader,
      });
      throw createError('Authentication required', 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET not configured');
      throw new Error('JWT_SECRET not configured');
    }

    try {
      const decoded = jwt.verify(token, secret) as { userId: string; email: string; name: string };
      req.userId = decoded.userId;
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        name: decoded.name,
      };
      console.log('Authentication successful:', { userId: decoded.userId, email: decoded.email });
    } catch (jwtError: any) {
      console.error('JWT verification failed:', {
        error: jwtError.name,
        message: jwtError.message,
        path: req.path,
      });
      if (jwtError.name === 'JsonWebTokenError' || jwtError.name === 'TokenExpiredError') {
        return next(createError('Invalid or expired token', 401));
      }
      throw jwtError;
    }

    next();
  } catch (error: any) {
    next(error);
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        try {
          const decoded = jwt.verify(token, secret) as { userId: string; email: string; name: string };
          req.userId = decoded.userId;
          req.user = {
            id: decoded.userId,
            email: decoded.email,
            name: decoded.name,
          };
        } catch {
          // Ignore invalid tokens in optional auth
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

