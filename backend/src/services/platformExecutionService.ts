import { PrismaClient } from '@prisma/client';
import { CompileService } from './compileService.js';

const prisma = new PrismaClient();
const compileService = new CompileService();

export class PlatformExecutionService {
  /**
   * Execute code for different platforms
   */
  async executeForPlatform(
    projectId: string,
    userId: string,
    code: string,
    language: string,
    platform: string,
    stdin?: string
  ): Promise<any> {
    // Get project to determine project type
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const projectType = project.projectType || 'generic';

    // Platform-specific execution
    switch (platform) {
      case 'web':
        return this.executeWeb(projectId, userId, code, language, projectType, stdin);
      case 'mobile':
        return this.executeMobile(projectId, userId, code, language, projectType, stdin);
      case 'desktop':
        return this.executeDesktop(projectId, userId, code, language, projectType, stdin);
      case 'server':
        return this.executeServer(projectId, userId, code, language, projectType, stdin);
      default:
        return this.executeGeneric(projectId, userId, code, language, stdin);
    }
  }

  private async executeWeb(
    projectId: string,
    userId: string,
    code: string,
    language: string,
    projectType: string,
    stdin?: string
  ): Promise<any> {
    // For web projects (React, Vue, HTML/CSS)
    if (projectType === 'react' || projectType === 'vue' || projectType === 'html-css') {
      // Create a run record
      const run = await prisma.run.create({
        data: {
          projectId,
          userId,
          language: 'javascript',
          code: this.wrapWebCode(code, projectType),
          stdin: stdin || '',
          status: 'PENDING',
        },
      });

      // Execute
      compileService.executeCode(run.id, {
        language: 'javascript',
        code: run.code,
        stdin: run.stdin || '',
      }).catch(console.error);

      return run;
    }

    return this.executeGeneric(projectId, userId, code, language, stdin);
  }

  private async executeMobile(
    projectId: string,
    userId: string,
    code: string,
    language: string,
    projectType: string,
    stdin?: string
  ): Promise<any> {
    // For mobile projects (Flutter, Android, iOS)
    if (projectType === 'flutter') {
      // Flutter code execution (would need Flutter runtime)
      const run = await prisma.run.create({
        data: {
          projectId,
          userId,
          language: 'dart',
          code,
          stdin: stdin || '',
          status: 'PENDING',
        },
      });

      // In production, this would use Flutter runtime
      setTimeout(async () => {
        await prisma.run.update({
          where: { id: run.id },
          data: {
            status: 'SUCCESS',
            output: 'Flutter app compiled successfully (simulated)',
          },
        });
      }, 2000);

      return run;
    }

    if (projectType === 'android') {
      // Android/Kotlin execution
      const run = await prisma.run.create({
        data: {
          projectId,
          userId,
          language: 'java',
          code,
          stdin: stdin || '',
          status: 'PENDING',
        },
      });

      compileService.executeCode(run.id, {
        language: 'java',
        code,
        stdin: stdin || '',
      }).catch(console.error);

      return run;
    }

    return this.executeGeneric(projectId, userId, code, language, stdin);
  }

  private async executeDesktop(
    projectId: string,
    userId: string,
    code: string,
    language: string,
    projectType: string,
    stdin?: string
  ): Promise<any> {
    // For desktop apps (Electron, native)
    return this.executeGeneric(projectId, userId, code, language, stdin);
  }

  private async executeServer(
    projectId: string,
    userId: string,
    code: string,
    language: string,
    projectType: string,
    stdin?: string
  ): Promise<any> {
    // For server/backend projects
    const run = await prisma.run.create({
      data: {
        projectId,
        userId,
        language,
        code,
        stdin: stdin || '',
        status: 'PENDING',
      },
    });

    compileService.executeCode(run.id, {
      language,
      code,
      stdin: stdin || '',
    }).catch(console.error);

    return run;
  }

  private async executeGeneric(
    projectId: string,
    userId: string,
    code: string,
    language: string,
    stdin?: string
  ): Promise<any> {
    const run = await prisma.run.create({
      data: {
        projectId,
        userId,
        language,
        code,
        stdin: stdin || '',
        status: 'PENDING',
      },
    });

    compileService.executeCode(run.id, {
      language,
      code,
      stdin: stdin || '',
    }).catch(console.error);

    return run;
  }

  private wrapWebCode(code: string, projectType: string): string {
    if (projectType === 'react') {
      return `
import React from 'react';
import ReactDOM from 'react-dom/client';

${code}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
`;
    }
    if (projectType === 'vue') {
      return `
import { createApp } from 'vue';

${code}

createApp(App).mount('#app');
`;
    }
    return code;
  }

  /**
   * Get available platforms for a project type
   */
  getAvailablePlatforms(projectType: string): string[] {
    const platformMap: Record<string, string[]> = {
      react: ['web'],
      vue: ['web'],
      angular: ['web'],
      'html-css': ['web'],
      flutter: ['mobile', 'web'],
      android: ['mobile'],
      ios: ['mobile'],
      nodejs: ['server'],
      'python-web': ['server', 'web'],
      'java-web': ['server'],
      go: ['server'],
      rust: ['server', 'desktop'],
      cpp: ['desktop', 'server'],
      c: ['desktop', 'server'],
      generic: ['server'],
    };

    return platformMap[projectType] || ['server'];
  }
}

