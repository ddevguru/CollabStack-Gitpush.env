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

  async connectAccount(userId: string, code: string, redirectUri?: string): Promise<any> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Google OAuth not configured');
    }

    // Use provided redirect_uri or fallback to env variable
    const redirect_uri = redirectUri || this.redirectUri;
    if (!redirect_uri) {
      throw new Error('Redirect URI not provided');
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: redirect_uri,
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
    const syncedFiles: any[] = [];
    const folderCache = new Map<string, string>(); // Cache folder IDs by path
    folderCache.set('', folderId); // Root folder

    // Helper function to get or create folder
    const getOrCreateFolder = async (folderPath: string, parentId: string): Promise<string> => {
      if (folderCache.has(folderPath)) {
        return folderCache.get(folderPath)!;
      }

      const folderName = folderPath.split('/').pop() || folderPath;
      
      // Check if folder exists
      const listResponse = await axios.get(
        `https://www.googleapis.com/drive/v3/files`,
        {
          params: {
            q: `'${parentId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name)',
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let folderId: string;
      if (listResponse.data.files && listResponse.data.files.length > 0) {
        folderId = listResponse.data.files[0].id;
      } else {
        // Create folder
        const createResponse = await axios.post(
          'https://www.googleapis.com/drive/v3/files',
          {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        folderId = createResponse.data.id;
        syncedFiles.push({ name: folderName, action: 'created', type: 'folder' });
      }

      folderCache.set(folderPath, folderId);
      return folderId;
    };

    // Helper function to upload file
    const uploadFile = async (file: any, parentFolderId: string) => {
      const fileName = file.path.split('/').pop() || file.path;
      
      // Check if file exists
      const listResponse = await axios.get(
        `https://www.googleapis.com/drive/v3/files`,
        {
          params: {
            q: `'${parentFolderId}' in parents and name='${fileName}' and trashed=false`,
            fields: 'files(id, name)',
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const existingFiles = listResponse.data.files || [];
      const existingFileId = existingFiles.length > 0 ? existingFiles[0].id : null;

      // Determine MIME type based on file extension
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      const mimeTypes: Record<string, string> = {
        'js': 'application/javascript',
        'ts': 'application/typescript',
        'jsx': 'application/javascript',
        'tsx': 'application/typescript',
        'json': 'application/json',
        'html': 'text/html',
        'css': 'text/css',
        'py': 'text/x-python',
        'java': 'text/x-java-source',
        'cpp': 'text/x-c++',
        'c': 'text/x-c',
        'md': 'text/markdown',
        'txt': 'text/plain',
      };
      const mimeType = mimeTypes[ext] || 'text/plain';

      if (existingFileId) {
        // Update existing file
        await axios.patch(
          `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}`,
          file.content,
          {
            params: { uploadType: 'media' },
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': mimeType,
            },
          }
        );
        syncedFiles.push({ name: fileName, action: 'updated', path: file.path });
      } else {
        // Create new file
        const metadata = {
          name: fileName,
          parents: [parentFolderId],
        };

        const boundary = '----WebKitFormBoundary' + Date.now();
        const multipartBody = Buffer.concat([
          Buffer.from(`--${boundary}\r\n`),
          Buffer.from('Content-Type: application/json\r\n\r\n'),
          Buffer.from(JSON.stringify(metadata)),
          Buffer.from(`\r\n--${boundary}\r\n`),
          Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`),
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
        syncedFiles.push({ name: fileName, action: 'created', path: file.path });
      }
    };

    // Process directories first, then files
    const directories = files.filter(f => f.isDirectory).sort((a, b) => a.path.localeCompare(b.path));
    const fileList = files.filter(f => !f.isDirectory);

    // Create all directories first
    for (const dir of directories) {
      const pathParts = dir.path.split('/').filter(p => p);
      let currentPath = '';
      let currentParentId = folderId;

      for (let i = 0; i < pathParts.length; i++) {
        currentPath = currentPath ? `${currentPath}/${pathParts[i]}` : pathParts[i];
        currentParentId = await getOrCreateFolder(currentPath, currentParentId);
      }
    }

    // Upload all files to their respective folders
    for (const file of fileList) {
      const pathParts = file.path.split('/').filter(p => p);
      const fileName = pathParts.pop() || file.path;
      const folderPath = pathParts.join('/');

      let parentFolderId = folderId;
      if (folderPath) {
        // Get folder ID from cache
        if (folderCache.has(folderPath)) {
          parentFolderId = folderCache.get(folderPath)!;
        } else {
          // Create folder path if it doesn't exist
          let currentPath = '';
          let currentParentId = folderId;
          for (const part of pathParts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            currentParentId = await getOrCreateFolder(currentPath, currentParentId);
          }
          parentFolderId = currentParentId;
        }
      }

      await uploadFile(file, parentFolderId);
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
      await new Promise<void>((resolve, reject) => {
        output.on('close', () => resolve());
        output.on('error', (err: Error) => reject(err));
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
