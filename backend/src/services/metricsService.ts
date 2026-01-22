import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MetricsService {
  /**
   * Analyze code and calculate metrics
   */
  async analyzeCode(projectId: string, filePath: string, code: string, language: string): Promise<any> {
    // Calculate basic metrics
    const linesOfCode = code.split('\n').length;
    const complexity = this.calculateComplexity(code, language);
    const maintainability = this.calculateMaintainability(code, complexity);
    const issues = this.detectIssues(code, language);
    const codeQuality = this.calculateQualityScore(maintainability, issues);

    // Upsert metric
    return prisma.codeMetric.upsert({
      where: {
        projectId_filePath: {
          projectId,
          filePath,
        },
      },
      update: {
        linesOfCode,
        complexity,
        maintainability,
        codeQuality,
        issues: issues as any,
        lastAnalyzed: new Date(),
      },
      create: {
        projectId,
        filePath,
        language,
        linesOfCode,
        complexity,
        maintainability,
        codeQuality,
        issues: issues as any,
      },
    });
  }

  /**
   * Calculate cyclomatic complexity (simplified)
   */
  private calculateComplexity(code: string, language: string): number {
    let complexity = 1; // Base complexity
    
    // Count decision points
    const decisionPatterns = [
      /\bif\s*\(/g,
      /\belse\s*{/g,
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bswitch\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\?\s*.*\s*:/g, // Ternary operators
    ];

    decisionPatterns.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return Math.round(complexity * 10) / 10;
  }

  /**
   * Calculate maintainability index (0-100)
   */
  private calculateMaintainability(code: string, complexity: number): number {
    const lines = code.split('\n').length;
    const avgLineLength = code.length / lines;
    
    // Simplified maintainability calculation
    // Lower complexity and shorter lines = higher maintainability
    let score = 100;
    score -= complexity * 5; // Penalize high complexity
    score -= Math.max(0, (avgLineLength - 80) * 0.1); // Penalize long lines
    
    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
  }

  /**
   * Detect code issues
   */
  private detectIssues(code: string, language: string): any[] {
    const issues: any[] = [];

    // Check for long functions
    const functions = code.match(/(?:function|const|let|var)\s+\w+\s*[=\(]/g);
    if (functions && functions.length > 0) {
      // Simplified: check if any function is too long
      const lines = code.split('\n').length;
      if (lines > 200) {
        issues.push({
          type: 'WARNING',
          message: 'File is very long (>200 lines). Consider splitting into smaller modules.',
          line: 1,
        });
      }
    }

    // Check for TODO/FIXME comments
    const todos = code.match(/(TODO|FIXME|XXX|HACK):\s*(.+)/gi);
    if (todos) {
      todos.forEach((todo, index) => {
        const line = code.substring(0, code.indexOf(todo)).split('\n').length;
        issues.push({
          type: 'INFO',
          message: todo,
          line,
        });
      });
    }

    // Check for console.log (in production code)
    const consoleLogs = code.match(/console\.(log|debug|warn|error)/g);
    if (consoleLogs && consoleLogs.length > 5) {
      issues.push({
        type: 'WARNING',
        message: `Multiple console statements found (${consoleLogs.length}). Consider removing for production.`,
        line: 1,
      });
    }

    return issues;
  }

  /**
   * Calculate overall code quality score
   */
  private calculateQualityScore(maintainability: number, issues: any[]): number {
    let score = maintainability;
    
    // Deduct points for issues
    issues.forEach(issue => {
      if (issue.type === 'ERROR') {
        score -= 5;
      } else if (issue.type === 'WARNING') {
        score -= 2;
      }
    });

    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
  }

  /**
   * Get project metrics summary
   */
  async getProjectMetrics(projectId: string): Promise<any> {
    const metrics = await prisma.codeMetric.findMany({
      where: { projectId },
    });

    if (metrics.length === 0) {
      return {
        totalFiles: 0,
        totalLines: 0,
        avgComplexity: 0,
        avgMaintainability: 0,
        avgQuality: 0,
        totalIssues: 0,
      };
    }

    const totalLines = metrics.reduce((sum, m) => sum + m.linesOfCode, 0);
    const avgComplexity = metrics.reduce((sum, m) => sum + m.complexity, 0) / metrics.length;
    const avgMaintainability = metrics.reduce((sum, m) => sum + m.maintainability, 0) / metrics.length;
    const avgQuality = metrics.reduce((sum, m) => sum + m.codeQuality, 0) / metrics.length;
    const totalIssues = metrics.reduce((sum, m) => {
      const issues = m.issues as any[];
      return sum + (issues?.length || 0);
    }, 0);

    return {
      totalFiles: metrics.length,
      totalLines,
      avgComplexity: Math.round(avgComplexity * 10) / 10,
      avgMaintainability: Math.round(avgMaintainability * 10) / 10,
      avgQuality: Math.round(avgQuality * 10) / 10,
      totalIssues,
      metrics,
    };
  }
}

