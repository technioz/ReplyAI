// Post generation uses the same AI_PROVIDER as reply generation (groq | xai | ollama).
// HTTP calls are centralized in @/lib/ai/openaiCompatibleChat.

import { generatePostGenerationChat } from '@/lib/ai/openaiCompatibleChat';
import { AIServiceFactory } from '@/lib/ai/AIServiceFactory';

export class PostGenerationAIAdapter {
  async generateContent(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      return await generatePostGenerationChat(systemPrompt, userPrompt);
    } catch (error) {
      console.error('AI generation error:', error);
      throw new Error(
        `Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /** Which provider will be used (for logging / UI). */
  static getProvider(): string {
    return AIServiceFactory.getCurrentProvider();
  }
}
