import { OLLAMA_CLOUD_MODELS } from '@/lib/article-generation/types';
import { GroqService } from './GroqService';
import { XAIService } from './XAIService';
import { OllamaService } from './OllamaService';

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
      case 'ollama':
        return new OllamaService();
      case 'groq':
      default:
        return new GroqService();
    }
  }
  
  static getCurrentProvider(): string {
    return process.env.AI_PROVIDER || 'groq';
  }
  
  static getAvailableProviders(): string[] {
    return ['groq', 'xai', 'ollama'];
  }

  static getAvailableOllamaCloudModels(): { id: string; label: string; description: string }[] {
    return OLLAMA_CLOUD_MODELS.map((m) => ({ id: m.id, label: m.label, description: m.description }));
  }
}


