import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import axios from 'axios';
import { emailService } from '../services/emailService.js';

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
        if (existingUser.isEmailVerified) {
          throw createError('User already exists', 409);
        } else {
          // Delete unverified user and their OTPs
          await prisma.otp.deleteMany({
            where: {
              email,
              type: 'EMAIL_VERIFICATION',
            },
          });
          await prisma.user.delete({
            where: { id: existingUser.id },
          });
        }
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Create unverified user
      const passwordHash = await bcrypt.hash(password, 10);
      const authProviders = ['EMAIL'];

      const tempUser = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          authProviders: authProviders as any,
          isEmailVerified: false,
        },
      });

      // Create new OTP
      await prisma.otp.create({
        data: {
          email,
          code: otp,
          type: 'EMAIL_VERIFICATION',
          expiresAt,
          userId: tempUser.id,
        },
      });

      // Send OTP email
      await emailService.sendOTPEmail(email, otp, name);

      res.status(200).json({
        success: true,
        message: 'OTP sent to your email. Please verify your email to complete registration.',
        data: {
          email,
          expiresIn: 600, // 10 minutes in seconds
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        throw createError('Email and OTP are required', 400);
      }

      // Find valid OTP
      const otpRecord = await prisma.otp.findFirst({
        where: {
          email,
          code: otp,
          type: 'EMAIL_VERIFICATION',
          isUsed: false,
          expiresAt: {
            gte: new Date(),
          },
        },
      });

      if (!otpRecord) {
        throw createError('Invalid or expired OTP', 400);
      }

      // Find the unverified user
      const user = await prisma.user.findUnique({
        where: { id: otpRecord.userId || '' },
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      // Mark OTP as used
      await prisma.otp.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      });

      // Verify user email
      const verifiedUser = await prisma.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          createdAt: true,
        },
      });

      // Send welcome email
      await emailService.sendWelcomeEmail(verifiedUser.email, verifiedUser.name);

      const token = this.generateToken(verifiedUser.id, verifiedUser.email, verifiedUser.name);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully!',
        data: {
          user: verifiedUser,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async resendOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      if (!email) {
        throw createError('Email is required', 400);
      }

      // Find unverified user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw createError('User not found', 404);
      }

      if (user.isEmailVerified) {
        throw createError('Email already verified', 400);
      }

      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete old OTPs
      await prisma.otp.deleteMany({
        where: {
          email,
          type: 'EMAIL_VERIFICATION',
          isUsed: false,
        },
      });

      // Create new OTP
      await prisma.otp.create({
        data: {
          email,
          code: otp,
          type: 'EMAIL_VERIFICATION',
          expiresAt,
          userId: user.id,
        },
      });

      // Send OTP email
      await emailService.sendOTPEmail(email, otp, user.name);

      res.status(200).json({
        success: true,
        message: 'OTP resent to your email',
        data: {
          email,
          expiresIn: 600, // 10 minutes in seconds
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

      // Check if email is verified
      if (!user.isEmailVerified) {
        throw createError('Please verify your email before logging in', 403);
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

