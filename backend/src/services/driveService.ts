import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { tmpdir } from 'os';
import { join } from 'path';
import { createWriteStream, mkdirSync, rmSync, readFileSync, writeFileSync } from 'fs';
import archiver from 'archiver';

const prisma = new PrismaClient();

export class DriveService {
  private clientId = process.env.GOOGLE_CLIENT_ID;
  private clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  private redirectUri = process.env.GOOGLE_REDIRECT_URI;

  async connectAccount(userId: string, code: string): Promise<any> {
    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      throw new Error('Google OAuth not configured');
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    if (!access_token) {
      throw new Error('Failed to get access token');
    }

    // Get user info
    const userResponse = await axios.get(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        googleToken: access_token,
        googleRefreshToken: refresh_token,
      },
    });

    return {
      email: userResponse.data.email,
      name: userResponse.data.name,
    };
  }

  async refreshToken(refreshToken: string): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Google OAuth not configured');
    }

    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }
    );

    return response.data.access_token;
  }

  async createFolder(token: string, name: string, description: string): Promise<any> {
    const response = await axios.post(
      'https://www.googleapis.com/drive/v3/files',
      {
        name,
        description,
        mimeType: 'application/vnd.google-apps.folder',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  async syncProject(
    token: string,
    folderId: string,
    files: any[],
    projectName: string
  ): Promise<any> {
    // List existing files in folder
    const listResponse = await axios.get(
      `https://www.googleapis.com/drive/v3/files`,
      {
        params: {
          q: `'${folderId}' in parents and trashed=false`,
          fields: 'files(id, name)',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const existingFiles = listResponse.data.files || [];
    const existingFileMap = new Map(existingFiles.map((f: any) => [f.name, f.id]));

    const syncedFiles: any[] = [];

    // Upload/update each file
    for (const file of files.filter(f => !f.isDirectory)) {
      const fileName = file.path.split('/').pop() || file.path;
      const existingFileId = existingFileMap.get(fileName);

      if (existingFileId) {
        // Update existing file
        await axios.patch(
          `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}`,
          file.content,
          {
            params: { uploadType: 'media' },
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'text/plain',
            },
          }
        );
        syncedFiles.push({ name: fileName, action: 'updated' });
      } else {
        // Create new file - use simple upload
        const metadata = {
          name: fileName,
          parents: [folderId],
        };

        const boundary = '----WebKitFormBoundary' + Date.now();
        const multipartBody = Buffer.concat([
          Buffer.from(`--${boundary}\r\n`),
          Buffer.from('Content-Type: application/json\r\n\r\n'),
          Buffer.from(JSON.stringify(metadata)),
          Buffer.from(`\r\n--${boundary}\r\n`),
          Buffer.from('Content-Type: text/plain\r\n\r\n'),
          Buffer.from(file.content),
          Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);

        await axios.post(
          'https://www.googleapis.com/upload/drive/v3/files',
          multipartBody,
          {
            params: { uploadType: 'multipart' },
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
          }
        );
        syncedFiles.push({ name: fileName, action: 'created' });
      }
    }

    return {
      syncedFiles,
      totalFiles: syncedFiles.length,
    };
  }

  async exportAsZip(token: string, files: any[], projectName: string): Promise<any> {
    // Create temporary directory
    const tempDir = join(tmpdir(), `drive-export-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });

    try {
      // Write files to temp directory
      for (const file of files.filter(f => !f.isDirectory)) {
        const filePath = join(tempDir, file.path);
        const dir = filePath.substring(0, filePath.lastIndexOf('/'));
        mkdirSync(dir, { recursive: true });
        writeFileSync(filePath, file.content);
      }

      // Create zip
      const zipPath = join(tmpdir(), `${projectName}-${Date.now()}.zip`);
      const output = createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.pipe(output);
      archive.directory(tempDir, false);
      await archive.finalize();

      // Wait for zip to be written
      await new Promise((resolve, reject) => {
        output.on('close', resolve);
        output.on('error', reject);
      });

      // Upload zip to Drive
      const zipContent = readFileSync(zipPath);
      const metadata = {
        name: `${projectName}.zip`,
        mimeType: 'application/zip',
      };

      // Use multipart upload
      const boundary = '----WebKitFormBoundary' + Date.now();
      const multipartBody = Buffer.concat([
        Buffer.from(`--${boundary}\r\n`),
        Buffer.from('Content-Type: application/json\r\n\r\n'),
        Buffer.from(JSON.stringify(metadata)),
        Buffer.from(`\r\n--${boundary}\r\n`),
        Buffer.from('Content-Type: application/zip\r\n\r\n'),
        zipContent,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const response = await axios.post(
        'https://www.googleapis.com/upload/drive/v3/files',
        multipartBody,
        {
          params: { uploadType: 'multipart' },
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
        }
      );

      // Cleanup
      rmSync(tempDir, { recursive: true, force: true });
      rmSync(zipPath, { force: true });

      return {
        fileId: response.data.id,
        name: response.data.name,
        webViewLink: `https://drive.google.com/file/d/${response.data.id}/view`,
      };
    } catch (error) {
      // Cleanup on error
      rmSync(tempDir, { recursive: true, force: true });
      throw error;
    }
  }
}
