import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { TemplateService } from '../services/templateService.js';

const templateService = new TemplateService();

export class TemplateController {
  async getTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const { language, category } = req.query;
      const templates = await templateService.getTemplates(
        language as string,
        category as string,
        true
      );

      res.json({
        success: true,
        data: { templates },
      });
    } catch (error) {
      next(error);
    }
  }

  async createTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { name, language, code, description, tags, category } = req.body;

      if (!name || !language || !code) {
        throw createError('Name, language, and code are required', 400);
      }

      const template = await templateService.createTemplate(
        req.userId,
        name,
        language,
        code,
        description,
        tags,
        category
      );

      res.status(201).json({
        success: true,
        data: { template },
      });
    } catch (error) {
      next(error);
    }
  }

  async useTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { templateId } = req.params;
      const template = await templateService.useTemplate(templateId);

      res.json({
        success: true,
        data: { template },
      });
    } catch (error) {
      next(error);
    }
  }

  async rateTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { templateId } = req.params;
      const { rating } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        throw createError('Rating must be between 1 and 5', 400);
      }

      const template = await templateService.rateTemplate(templateId, rating);

      res.json({
        success: true,
        data: { template },
      });
    } catch (error) {
      next(error);
    }
  }

  async getSnippets(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const snippets = await templateService.getUserSnippets(req.userId);

      res.json({
        success: true,
        data: { snippets },
      });
    } catch (error) {
      next(error);
    }
  }

  async createSnippet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { name, code, language, tags } = req.body;

      if (!name || !code || !language) {
        throw createError('Name, code, and language are required', 400);
      }

      const snippet = await templateService.createSnippet(
        req.userId,
        name,
        code,
        language,
        tags
      );

      res.status(201).json({
        success: true,
        data: { snippet },
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleFavorite(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { snippetId } = req.params;
      const snippet = await templateService.toggleFavorite(snippetId, req.userId);

      res.json({
        success: true,
        data: { snippet },
      });
    } catch (error) {
      next(error);
    }
  }
}

