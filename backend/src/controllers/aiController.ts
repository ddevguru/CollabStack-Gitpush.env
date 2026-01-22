import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import axios from 'axios';

const prisma = new PrismaClient();

export class AIController {
  async chat(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId } = req.params;
      const { message } = req.body;

      if (!message) {
        throw createError('Message required', 400);
      }

      // Verify project access
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerTeam: {
            OR: [
              { leaderId: req.userId },
              { members: { some: { userId: req.userId } } },
            ],
          },
        },
        include: {
          files: {
            take: 10,
            orderBy: { updatedAt: 'desc' },
          },
        },
      });

      if (!project) {
        throw createError('Project not found or access denied', 404);
      }

      // Get project context (recent files)
      const context = project.files
        .slice(0, 5)
        .map((f) => `File: ${f.path}\n${f.content.substring(0, 500)}`)
        .join('\n\n');

      // Call AI service (using OpenAI API or similar)
      // For now, we'll use a simple mock response
      // In production, integrate with OpenAI, Anthropic, or similar
      const aiResponse = await this.getAIResponse(message, context, project);

      // Save conversation
      await prisma.sessionEvent.create({
        data: {
          projectId,
          type: 'ai_chat',
          data: {
            userId: req.userId,
            userMessage: message,
            aiResponse: aiResponse,
          } as any,
        },
      });

      res.json({
        success: true,
        data: {
          messageId: conversation.id,
          response: aiResponse,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  private async getAIResponse(message: string, context: string, project: any): Promise<string> {
    // Use OpenAI ChatGPT API
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (!openaiApiKey) {
      // Fallback to mock response if API key not configured
      return this.getMockResponse(message, project);
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4', // or 'gpt-3.5-turbo' for faster responses
          messages: [
            {
              role: 'system',
              content: `You are a helpful coding assistant for a project called "${project.name}". You have access to the following project context:\n\n${context}\n\nProvide helpful, accurate, and concise responses about code, debugging, optimization, and best practices.`,
            },
            {
              role: 'user',
              content: message,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
    } catch (error: any) {
      console.error('OpenAI API error:', error.response?.data || error.message);
      // Fallback to mock response on error
      return this.getMockResponse(message, project);
    }
  }

  private getMockResponse(message: string, project: any): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('bug') || lowerMessage.includes('error')) {
      return `I can help you debug! Based on your project "${project.name}", here are some common debugging tips:\n\n1. Check the console for error messages\n2. Review recent file changes\n3. Test the code in isolation\n4. Use breakpoints to step through code\n\nWould you like me to analyze a specific file or error message?`;
    }
    
    if (lowerMessage.includes('explain') || lowerMessage.includes('how')) {
      return `I'd be happy to explain! Based on your project context, I can help you understand:\n\n- Code structure and architecture\n- Functionality and logic flow\n- Best practices and patterns\n- Optimization opportunities\n\nWhat specific part would you like me to explain?`;
    }
    
    if (lowerMessage.includes('optimize') || lowerMessage.includes('improve')) {
      return `Here are some optimization suggestions for your project:\n\n1. Review code for redundant operations\n2. Consider caching frequently accessed data\n3. Optimize database queries if applicable\n4. Minimize bundle size for frontend projects\n5. Use lazy loading where appropriate\n\nWould you like specific recommendations for any file?`;
    }
    
    return `I'm here to help with your "${project.name}" project! I can assist with:\n\n- Code explanations and documentation\n- Debugging and error fixing\n- Code optimization and refactoring\n- Best practices and patterns\n- Architecture suggestions\n\nWhat would you like help with?`;
  }

  async getChatHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw createError('Unauthorized', 401);
      }

      const { projectId } = req.params;

      // Verify access
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          ownerTeam: {
            OR: [
              { leaderId: req.userId },
              { members: { some: { userId: req.userId } } },
            ],
          },
        },
      });

      if (!project) {
        throw createError('Project not found or access denied', 404);
      }

      const events = await prisma.sessionEvent.findMany({
        where: {
          projectId,
          type: 'ai_chat',
        },
        orderBy: {
          timestamp: 'asc',
        },
        take: 100,
      });

      // Filter by userId from data field
      const userEvents = events.filter(event => {
        const data = event.data as any;
        return data?.userId === req.userId;
      });

      const messages = userEvents.flatMap((event) => {
        const data = event.data as any;
        const msgs: any[] = [];
        
        if (data.userMessage) {
          msgs.push({
            id: `${event.id}-user`,
            role: 'user',
            content: data.userMessage,
            timestamp: event.timestamp.toISOString(),
          });
        }
        
        if (data.aiResponse) {
          msgs.push({
            id: `${event.id}-ai`,
            role: 'assistant',
            content: data.aiResponse,
            timestamp: event.timestamp.toISOString(),
          });
        }
        
        return msgs;
      });

      res.json({
        success: true,
        data: { messages },
      });
    } catch (error) {
      next(error);
    }
  }
}

