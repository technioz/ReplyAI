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
    return [
      { id: 'gemma3:27b', label: 'Gemma 3 27B', description: 'Best balance of speed and quality' },
      { id: 'deepseek-v3.2', label: 'DeepSeek V3.2', description: 'Excellent reasoning and writing' },
      { id: 'qwen3-coder:480b', label: 'Qwen3 Coder 480B', description: 'Largest model, best for technical articles' },
      { id: 'kimi-k2:1t', label: 'Kimi K2 1T', description: 'Massive context window, great for research-heavy articles' },
      { id: 'gemma3:4b', label: 'Gemma 3 4B', description: 'Fastest, good for drafts and iterations' },
    ];
  }
}


