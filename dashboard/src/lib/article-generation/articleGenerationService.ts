import { ArticlePromptBuilder } from './promptBuilder';
import { BraveSearchService } from '../post-generation/braveSearchService';
import { ArticleTone, ArticleLength, ArticleGenerationResponse } from './types';

export class ArticleGenerationService {
  private promptBuilder: ArticlePromptBuilder;
  private braveSearch: BraveSearchService;

  constructor() {
    this.promptBuilder = new ArticlePromptBuilder();
    this.braveSearch = new BraveSearchService();
  }

  async prepareArticle(
    topic: string | undefined,
    tone: ArticleTone,
    length: ArticleLength,
    includeSEO: boolean
  ): Promise<{ systemPrompt: string; userPrompt: string }> {
    let topicContext: string | null = null;

    const searchTopic = topic || this.inferTopicFromTone(tone);

    if (searchTopic && this.braveSearch.isEnabled()) {
      topicContext = await this.braveSearch.fetchTopicContext(
        `${searchTopic} devops automation AI long-form article insights`,
        'X'
      );
    }

    const { systemPrompt, userPrompt } = this.promptBuilder.buildArticlePrompt(
      topic,
      tone,
      length,
      includeSEO,
      topicContext || undefined
    );

    return { systemPrompt, userPrompt };
  }

  extractMetadata(
    content: string,
    tone: ArticleTone,
    length: ArticleLength,
    model: string,
    includeSEO: boolean
  ): ArticleGenerationResponse['metadata'] {
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    return {
      tone,
      length,
      wordCount,
      model,
      seoOptimized: includeSEO
    };
  }

  private inferTopicFromTone(tone: ArticleTone): string {
    const topics: Record<ArticleTone, string> = {
      authoritative: 'DevOps best practices and infrastructure automation',
      conversational: 'AI tools for developers and automation workflows',
      contrarian: 'why most DevOps implementations fail and what actually works',
      storytelling: 'real production incidents and lessons learned in DevOps'
    };
    return topics[tone];
  }
}