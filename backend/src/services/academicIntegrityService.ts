import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AcademicIntegrityService {
  /**
   * Enable exam mode for a project
   */
  async enableExamMode(projectId: string, lockDownUntil: Date): Promise<any> {
    return prisma.academicIntegrity.upsert({
      where: { projectId },
      update: {
        examMode: true,
        lockDownUntil,
      },
      create: {
        projectId,
        examMode: true,
        lockDownUntil,
      },
    });
  }

  /**
   * Disable exam mode
   */
  async disableExamMode(projectId: string): Promise<any> {
    return prisma.academicIntegrity.update({
      where: { projectId },
      data: {
        examMode: false,
        lockDownUntil: null,
      },
    });
  }

  /**
   * Check plagiarism (simplified - would use ML model in production)
   */
  async checkPlagiarism(projectId: string, code: string): Promise<number> {
    // In production, this would:
    // 1. Compare against code database
    // 2. Use ML model for similarity detection
    // 3. Check against external sources (GitHub, Stack Overflow, etc.)
    
    // For now, return mock score
    const integrity = await prisma.academicIntegrity.findUnique({
      where: { projectId },
    });

    if (!integrity) {
      await prisma.academicIntegrity.create({
        data: {
          projectId,
          plagiarismScore: 0,
        },
      });
      return 0;
    }

    // Mock: random score between 0-30 (low similarity)
    const score = Math.random() * 30;
    
    await prisma.academicIntegrity.update({
      where: { projectId },
      data: {
        plagiarismScore: score,
      },
    });

    return score;
  }

  /**
   * Log activity for academic integrity tracking
   */
  async logActivity(projectId: string, activity: any): Promise<void> {
    const integrity = await prisma.academicIntegrity.findUnique({
      where: { projectId },
    });

    const activityLog = integrity?.activityLog as any[] || [];
    activityLog.push({
      ...activity,
      timestamp: new Date().toISOString(),
    });

    await prisma.academicIntegrity.upsert({
      where: { projectId },
      update: {
        activityLog: activityLog as any,
      },
      create: {
        projectId,
        activityLog: activityLog as any,
      },
    });
  }

  /**
   * Get academic integrity status
   */
  async getStatus(projectId: string): Promise<any> {
    return prisma.academicIntegrity.findUnique({
      where: { projectId },
    });
  }
}

