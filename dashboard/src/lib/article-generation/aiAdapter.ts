import { AIServiceFactory } from '../ai/AIServiceFactory';
import { Brief, ArticleTone, ArticleLength, WriterProfile } from './types';
import { generateArticle } from './articleAgent';
import { BraveSearchService } from '../post-generation/braveSearchService';

export class ArticleGenerationAIAdapter {
  async generateArticle(
    topic: string | undefined,
    tone: ArticleTone,
    length: ArticleLength,
    includeSEO: boolean,
    model: string,
    writerProfile?: WriterProfile
  ): Promise<{ brief: Brief; draft: string; final: string }> {
    const apiKey = process.env.OLLAMA_CLOUD_API_KEY;
    if (!apiKey) {
      throw new Error('OLLAMA_CLOUD_API_KEY is required for article generation');
    }

    const braveSearch = new BraveSearchService();
    let context: string | undefined;

    if (topic && braveSearch.isEnabled()) {
      console.log(`[ArticleGen] Fetching Brave Search context for topic: "${topic}"`);
      const searchContext = await braveSearch.fetchTopicContext(
        `${topic} devops automation AI long-form article insights`,
        'X'
      );
      context = searchContext || undefined;
    }

    console.log(`[ArticleGen] Using Ollama Cloud model: ${model}, tone: ${tone}, length: ${length}`);

    const result = await generateArticle({
      topic,
      tone,
      length,
      includeSEO,
      model,
      context,
      apiKey,
      writerProfile,
    });

    return result;
  }

  static getAvailableModels() {
    return AIServiceFactory.getAvailableOllamaCloudModels();
  }
}