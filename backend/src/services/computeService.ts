import { PrismaClient, ComputeJobStatus, ComputeResourceType, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

interface JobRequest {
  projectId: string;
  userId: string;
  language: string;
  code: string;
  resourceType?: ComputeResourceType;
  gpuType?: string;
  scheduledAt?: Date;
  dockerImage?: string;
}

export class ComputeService {
  /**
   * Create a compute job and queue it for execution
   */
  async createJob(request: JobRequest): Promise<any> {
    // Check user credits
    const credits = await prisma.computeCredits.findUnique({
      where: { userId: request.userId },
    });

    if (!credits || credits.balance < 0.1) {
      throw new Error('Insufficient compute credits. Please upgrade your plan.');
    }

    // Estimate credits needed (simplified - would use ML model in production)
    const estimatedCredits = this.estimateCredits(request);

    if (credits.balance < estimatedCredits) {
      throw new Error(`Insufficient credits. Need ${estimatedCredits}, have ${credits.balance}`);
    }

    // Create job
    const job = await prisma.computeJob.create({
      data: {
        projectId: request.projectId,
        userId: request.userId,
        jobType: 'code_execution',
        language: request.language,
        code: request.code,
        resourceType: request.resourceType || ComputeResourceType.CPU,
        gpuType: request.gpuType,
        scheduledAt: request.scheduledAt,
        dockerImage: request.dockerImage,
        status: request.scheduledAt ? ComputeJobStatus.SCHEDULED : ComputeJobStatus.QUEUED,
        creditsUsed: estimatedCredits,
      },
    });

    // Deduct credits
    await this.deductCredits(request.userId, estimatedCredits, `Job ${job.id}`, job.id);

    // If scheduled, create schedule entry
    if (request.scheduledAt) {
      await this.scheduleGPU(job.id, request);
    } else {
      // Queue for immediate execution
      await this.queueJob(job.id);
    }

    return job;
  }

  /**
   * Estimate credits needed for a job
   */
  private estimateCredits(request: JobRequest): number {
    // Simplified estimation
    // In production, use ML model based on historical data
    const baseCredits = 0.1; // Base cost per job
    const codeLengthMultiplier = request.code.length / 1000; // 0.001 credits per 1000 chars
    const resourceMultiplier = request.resourceType === ComputeResourceType.GPU ? 10 : 1;
    
    return baseCredits + (codeLengthMultiplier * 0.01) * resourceMultiplier;
  }

  /**
   * Deduct credits from user account
   */
  private async deductCredits(userId: string, amount: number, description: string, jobId: string) {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const credits = await tx.computeCredits.findUnique({
        where: { userId },
      });

      if (!credits) {
        throw new Error('User credits not found');
      }

      await tx.computeCredits.update({
        where: { userId },
        data: {
          balance: credits.balance - amount,
          totalSpent: credits.totalSpent + amount,
        },
      });

      await tx.creditTransaction.create({
        data: {
          creditsId: credits.id,
          type: 'SPENT',
          amount: -amount,
          description,
          jobId,
        },
      });
    });
  }

  /**
   * Schedule GPU time (calendar-based)
   */
  private async scheduleGPU(jobId: string, request: JobRequest) {
    // Find available institution with GPUs
    const institutions = await prisma.institution.findMany({
      where: {
        isActive: true,
        gpuCount: { gt: 0 },
        ...(request.gpuType && { gpuTypes: { has: request.gpuType } }),
      },
    });

    if (institutions.length === 0) {
      throw new Error('No available GPU clusters');
    }

    // Simple scheduling - in production, use optimization algorithm
    const institution = institutions[0];
    const endTime = new Date(request.scheduledAt!);
    endTime.setHours(endTime.getHours() + 1); // Default 1 hour slot

    await prisma.gPUSchedule.create({
      data: {
        institutionId: institution.id,
        userId: request.userId,
        startTime: request.scheduledAt!,
        endTime,
        gpuCount: 1,
        gpuType: request.gpuType,
        purpose: 'compute_job',
        jobId,
      },
    });
  }

  /**
   * Queue job for immediate execution
   */
  private async queueJob(jobId: string) {
    // In production, this would:
    // 1. Find best available cluster
    // 2. Create Docker container
    // 3. Submit to Kubernetes queue
    // 4. Update job status
    
    // For now, simulate immediate execution
    setTimeout(async () => {
      await prisma.computeJob.update({
        where: { id: jobId },
        data: {
          status: ComputeJobStatus.RUNNING,
          startedAt: new Date(),
        },
      });

      // Simulate execution
      setTimeout(async () => {
        await prisma.computeJob.update({
          where: { id: jobId },
          data: {
            status: ComputeJobStatus.COMPLETED,
            completedAt: new Date(),
            computeHours: 0.1,
            output: 'Job executed successfully (simulated)',
          },
        });
      }, 2000);
    }, 1000);
  }

  /**
   * Get user's compute credits balance
   */
  async getCredits(userId: string): Promise<any> {
    let credits = await prisma.computeCredits.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!credits) {
      // Initialize credits for new user (free tier: 10 hours = 10 credits)
      credits = await prisma.computeCredits.create({
        data: {
          userId,
          balance: 10,
          totalEarned: 10,
        },
        include: {
          transactions: [],
        },
      });
    }

    return credits;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<any> {
    return prisma.computeJob.findUnique({
      where: { id: jobId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * List user's compute jobs
   */
  async listJobs(userId: string, limit: number = 50): Promise<any[]> {
    return prisma.computeJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }
}

