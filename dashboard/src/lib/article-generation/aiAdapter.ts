import { callOllamaCloudChat, ChatMessage } from '../ai/openaiCompatibleChat';
import { AIServiceFactory } from '../ai/AIServiceFactory';

export const ARTICLE_CHAT_OPTIONS = {
  max_tokens: 8192,
  temperature: 1.0,
  top_p: 0.95,
  stream: false as const,
};

export class ArticleGenerationAIAdapter {
  async generateContent(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const apiKey = process.env.OLLAMA_CLOUD_API_KEY;
    if (!apiKey) {
      throw new Error('OLLAMA_CLOUD_API_KEY is required for article generation');
    }

    console.log(`[ArticleGen] Using Ollama Cloud model: ${model}`);

    const content = await callOllamaCloudChat(
      model,
      apiKey,
      messages,
      ARTICLE_CHAT_OPTIONS
    );

    return content;
  }

  static getAvailableModels() {
    return AIServiceFactory.getAvailableOllamaCloudModels();
  }
}