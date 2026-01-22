import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import axios from 'axios';

const prisma = new PrismaClient();

export class AuthController {
  private generateToken(userId: string, email: string, name: string): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }
    return jwt.sign({ userId, email, name }, secret, { expiresIn: '7d' });
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, password } = req.body;

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw createError('User already exists', 409);
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const authProviders = ['EMAIL'];

      const user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          authProviders: authProviders as any,
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          createdAt: true,
        },
      });

      const token = this.generateToken(user.id, user.email, user.name);

      res.status(201).json({
        success: true,
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.passwordHash) {
        throw createError('Invalid credentials', 401);
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        throw createError('Invalid credentials', 401);
      }

      const token = this.generateToken(user.id, user.email, user.name);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          githubUsername: true,
          authProviders: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  async githubCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;

      if (!code) {
        throw createError('Authorization code required', 400);
      }

      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        throw createError('GitHub OAuth not configured', 500);
      }

      // Exchange code for access token
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
        },
        {
          headers: { Accept: 'application/json' },
        }
      );

      const { access_token } = tokenResponse.data;

      if (!access_token) {
        throw createError('Failed to get access token', 400);
      }

      // Get user info from GitHub
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const { email: primaryEmail, name, login, avatar_url } = userResponse.data;

      // If email is not in user endpoint, try to get from emails endpoint
      let email = primaryEmail;
      if (!email) {
        try {
          const emailsResponse = await axios.get('https://api.github.com/user/emails', {
            headers: { Authorization: `Bearer ${access_token}` },
          });
          const emails = emailsResponse.data;
          const primaryEmailObj = emails.find((e: any) => e.primary);
          email = primaryEmailObj?.email || emails[0]?.email;
        } catch (error) {
          // If we can't get email, use login as fallback
          email = `${login}@users.noreply.github.com`;
        }
      }

      if (!email) {
        throw createError('GitHub account email not available. Please make your email public or add it to your GitHub account.', 400);
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        // Update existing user
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            githubToken: access_token,
            githubUsername: login,
            authProviders: {
              set: Array.from(
                new Set([...(user.authProviders as string[]), 'GITHUB'])
              ),
            } as any,
          },
        });
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            name: name || login,
            avatar: avatar_url,
            githubToken: access_token,
            githubUsername: login,
            authProviders: ['GITHUB'] as any,
          },
        });
      }

      const token = this.generateToken(user.id, user.email, user.name);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            githubUsername: user.githubUsername,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async googleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.body;

      if (!code) {
        throw createError('Authorization code required', 400);
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        throw createError('Google OAuth not configured', 500);
      }

      // Exchange code for tokens
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }
      );

      const { access_token, refresh_token } = tokenResponse.data;

      if (!access_token) {
        throw createError('Failed to get access token', 400);
      }

      // Get user info from Google
      const userResponse = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      const { email, name, picture } = userResponse.data;

      if (!email) {
        throw createError('Google account email not available', 400);
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleToken: access_token,
            googleRefreshToken: refresh_token,
            authProviders: {
              set: Array.from(
                new Set([...(user.authProviders as string[]), 'GOOGLE'])
              ),
            } as any,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            name: name || email.split('@')[0],
            avatar: picture,
            googleToken: access_token,
            googleRefreshToken: refresh_token,
            authProviders: ['GOOGLE'] as any,
          },
        });
      }

      const token = this.generateToken(user.id, user.email, user.name);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

