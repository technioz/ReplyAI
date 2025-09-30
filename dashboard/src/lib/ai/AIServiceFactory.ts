import { GroqService } from './GroqService';
import { XAIService } from './XAIService';

export interface AIService {
  generateReply(tweetText: string, tone: string, userContext?: any): Promise<{
    reply: string;
    processingTime?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    } | null;
  }>;
}

export class AIServiceFactory {
  static createService(): AIService {
    const provider = process.env.AI_PROVIDER || 'groq';
    
    switch (provider.toLowerCase()) {
      case 'xai':
        return new XAIService();
      case 'groq':
      default:
        return new GroqService();
    }
  }
  
  static getCurrentProvider(): string {
    return process.env.AI_PROVIDER || 'groq';
  }
  
  static getAvailableProviders(): string[] {
    return ['groq', 'xai'];
  }
}
