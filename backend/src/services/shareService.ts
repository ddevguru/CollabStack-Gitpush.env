import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

export class ShareService {
  /**
   * Create a share link for project or file
   */
  async createShareLink(
    projectId?: string,
    fileId?: string,
    code?: string,
    accessType: string = 'READ_ONLY',
    expiresAt?: Date,
    maxViews?: number,
    password?: string
  ): Promise<any> {
    // Generate short code (8 characters)
    const shortCode = this.generateShortCode();

    return prisma.shareLink.create({
      data: {
        projectId,
        fileId,
        code,
        shortCode,
        accessType,
        expiresAt,
        maxViews,
        password: password ? await this.hashPassword(password) : null,
      },
    });
  }

  /**
   * Get share link by short code
   */
  async getShareLink(shortCode: string, password?: string): Promise<any> {
    const shareLink = await prisma.shareLink.findUnique({
      where: { shortCode },
    });

    if (!shareLink) {
      throw new Error('Share link not found');
    }

    // Check expiration
    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      throw new Error('Share link has expired');
    }

    // Check max views
    if (shareLink.maxViews && shareLink.viewCount >= shareLink.maxViews) {
      throw new Error('Share link has reached maximum views');
    }

    // Check password
    if (shareLink.password) {
      if (!password) {
        throw new Error('Password required');
      }
      const isValid = await this.verifyPassword(password, shareLink.password);
      if (!isValid) {
        throw new Error('Invalid password');
      }
    }

    // Increment view count
    await prisma.shareLink.update({
      where: { id: shareLink.id },
      data: {
        viewCount: shareLink.viewCount + 1,
      },
    });

    return shareLink;
  }

  /**
   * Generate short code
   */
  private generateShortCode(): string {
    // Generate 8 character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Hash password (simplified - use bcrypt in production)
   */
  private async hashPassword(password: string): Promise<string> {
    // In production, use bcrypt
    return Buffer.from(password).toString('base64');
  }

  /**
   * Verify password
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const decoded = Buffer.from(hash, 'base64').toString();
    return decoded === password;
  }

  /**
   * Get QR code data URL (would use qrcode library in production)
   */
  generateQRCode(shortCode: string): string {
    // In production, use 'qrcode' npm package
    // For now, return URL
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://yourdomain.com/share/${shortCode}`)}`;
  }
}

