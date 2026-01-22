import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TemplateService {
  /**
   * Get templates by language and category
   */
  async getTemplates(language?: string, category?: string, isPublic: boolean = true): Promise<any[]> {
    return prisma.codeTemplate.findMany({
      where: {
        ...(language && { language }),
        ...(category && { category }),
        ...(isPublic && { isPublic: true }),
      },
      orderBy: [
        { usageCount: 'desc' },
        { rating: 'desc' },
      ],
      take: 50,
    });
  }

  /**
   * Create a new template
   */
  async createTemplate(
    userId: string,
    name: string,
    language: string,
    code: string,
    description?: string,
    tags?: string[],
    category?: string
  ): Promise<any> {
    return prisma.codeTemplate.create({
      data: {
        userId,
        name,
        language,
        code,
        description,
        tags: tags || [],
        category: category || 'boilerplate',
        isPublic: false, // User templates are private by default
      },
    });
  }

  /**
   * Use a template (increment usage count)
   */
  async useTemplate(templateId: string): Promise<any> {
    const template = await prisma.codeTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    return prisma.codeTemplate.update({
      where: { id: templateId },
      data: {
        usageCount: template.usageCount + 1,
      },
    });
  }

  /**
   * Rate a template
   */
  async rateTemplate(templateId: string, rating: number): Promise<any> {
    const template = await prisma.codeTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Simple average rating (in production, use weighted average)
    const newRating = (template.rating + rating) / 2;

    return prisma.codeTemplate.update({
      where: { id: templateId },
      data: {
        rating: newRating,
      },
    });
  }

  /**
   * Get user's snippets
   */
  async getUserSnippets(userId: string): Promise<any[]> {
    return prisma.codeSnippet.findMany({
      where: { userId },
      orderBy: [
        { isFavorite: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  /**
   * Create snippet
   */
  async createSnippet(
    userId: string,
    name: string,
    code: string,
    language: string,
    tags?: string[]
  ): Promise<any> {
    return prisma.codeSnippet.create({
      data: {
        userId,
        name,
        code,
        language,
        tags: tags || [],
      },
    });
  }

  /**
   * Toggle snippet favorite
   */
  async toggleFavorite(snippetId: string, userId: string): Promise<any> {
    const snippet = await prisma.codeSnippet.findFirst({
      where: {
        id: snippetId,
        userId,
      },
    });

    if (!snippet) {
      throw new Error('Snippet not found');
    }

    return prisma.codeSnippet.update({
      where: { id: snippetId },
      data: {
        isFavorite: !snippet.isFavorite,
      },
    });
  }
}

