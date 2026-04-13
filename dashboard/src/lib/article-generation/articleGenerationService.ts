import { ArticleTone, ArticleLength, ArticleGenerationResponse, Brief } from './types';
import { ArticleGenerationAIAdapter } from './aiAdapter';

export class ArticleGenerationService {
  private aiAdapter: ArticleGenerationAIAdapter;

  constructor() {
    this.aiAdapter = new ArticleGenerationAIAdapter();
  }

  async generateArticle(
    topic: string | undefined,
    tone: ArticleTone,
    length: ArticleLength,
    includeSEO: boolean,
    model: string
  ): Promise<{ content: string; brief: Brief; draft: string; final: string }> {
    const result = await this.aiAdapter.generateArticle(
      topic,
      tone,
      length,
      includeSEO,
      model
    );

    return {
      content: result.final,
      brief: result.brief,
      draft: result.draft,
      final: result.final,
    };
  }

  extractMetadata(
    content: string,
    tone: ArticleTone,
    length: ArticleLength,
    model: string,
    includeSEO: boolean,
    brief: Brief,
    draft: string,
    final: string
  ): ArticleGenerationResponse['metadata'] {
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    return {
      tone,
      length,
      wordCount,
      model,
      seoOptimized: includeSEO,
      brief,
      draft,
      final,
    };
  }
}