import { PrismaClient, RunStatus } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface ExecuteRequest {
  language: string;
  version?: string;
  code: string;
  stdin?: string;
}

export class CompileService {
  private judge0ApiUrl = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com';
  private judge0ApiKey = process.env.JUDGE0_API_KEY;
  private useDocker = process.env.USE_DOCKER_COMPILER === 'true';

  async executeCode(runId: string, request: ExecuteRequest): Promise<void> {
    try {
      // Update status to RUNNING
      await prisma.run.update({
        where: { id: runId },
        data: { status: RunStatus.RUNNING },
      });

      let result;

      if (this.useDocker && !this.judge0ApiKey) {
        // Use local Docker-based execution
        result = await this.executeWithDocker(request);
      } else if (this.judge0ApiKey) {
        // Use Judge0 API
        result = await this.executeWithJudge0(request);
      } else {
        // Fallback: simple Node.js execution for JavaScript
        result = await this.executeWithNodeJS(request);
      }

      // Update run with results
      await prisma.run.update({
        where: { id: runId },
        data: {
          status: result.status === 'success' ? RunStatus.SUCCESS : RunStatus.ERROR,
          output: result.output || null,
          error: result.error || null,
          timeMs: result.timeMs || null,
          memoryKb: result.memoryKb || null,
        },
      });
    } catch (error: any) {
      console.error('Execution error:', error);
      await prisma.run.update({
        where: { id: runId },
        data: {
          status: RunStatus.ERROR,
          error: error.message || 'Execution failed',
        },
      });
    }
  }

  private async executeWithJudge0(request: ExecuteRequest): Promise<any> {
    const languageMap: Record<string, number> = {
      'javascript': 63,
      'python': 71,
      'java': 62,
      'cpp': 54,
      'c': 50,
    };

    const languageId = languageMap[request.language.toLowerCase()] || 63;

    try {
      const response = await axios.post(
        `${this.judge0ApiUrl}/submissions`,
        {
          source_code: request.code,
          language_id: languageId,
          stdin: request.stdin || '',
        },
        {
          headers: {
            'X-RapidAPI-Key': this.judge0ApiKey,
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
            'Content-Type': 'application/json',
          },
        }
      );

      const token = response.data.token;

      // Poll for result
      let result;
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const statusResponse = await axios.get(
          `${this.judge0ApiUrl}/submissions/${token}`,
          {
            headers: {
              'X-RapidAPI-Key': this.judge0ApiKey,
              'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
            },
          }
        );

        result = statusResponse.data;

        if (result.status.id > 2) {
          // Status > 2 means finished
          break;
        }

        attempts++;
      }

      return {
        status: result.status.id === 3 ? 'success' : 'error',
        output: result.stdout || '',
        error: result.stderr || result.compile_output || '',
        timeMs: result.time ? parseFloat(result.time) * 1000 : null,
        memoryKb: result.memory || null,
      };
    } catch (error: any) {
      throw new Error(`Judge0 API error: ${error.message}`);
    }
  }

  private async executeWithDocker(request: ExecuteRequest): Promise<any> {
    // TODO: Implement Docker-based execution
    // This would require a separate Docker service
    throw new Error('Docker execution not yet implemented');
  }

  private async executeWithNodeJS(request: ExecuteRequest): Promise<any> {
    if (request.language.toLowerCase() !== 'javascript') {
      throw new Error('Node.js execution only supports JavaScript');
    }

    try {
      const startTime = Date.now();
      const { spawn } = await import('child_process');

      // Write code to temp file and execute
      const fs = await import('fs/promises');
      const path = await import('path');
      const os = await import('os');

      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'code-exec-'));
      const tempFile = path.join(tempDir, 'code.js');

      await fs.writeFile(tempFile, request.code);

      try {
        return await new Promise<any>((resolve, reject) => {
          const child = spawn('node', [tempFile], {
            timeout: 5000,
          });

          let stdout = '';
          let stderr = '';

          child.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          child.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          if (request.stdin) {
            child.stdin.write(request.stdin);
            child.stdin.end();
          }

          child.on('close', (code) => {
            const timeMs = Date.now() - startTime;
            resolve({
              status: code === 0 && !stderr ? 'success' : 'error',
              output: stdout || '',
              error: stderr || '',
              timeMs,
            });
          });

          child.on('error', (error) => {
            reject(error);
          });
        });
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    } catch (error: any) {
      return {
        status: 'error',
        output: '',
        error: error.message || 'Execution failed',
        timeMs: 0,
      };
    }
  }
}

