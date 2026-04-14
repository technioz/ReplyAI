import { Brief, ArticleTone, ArticleLength, WriterProfile } from './types';
import { generateArticle } from './articleAgent';
import { BraveSearchService } from '../post-generation/braveSearchService';
import { createArticleChatCompleter } from './articleLlmClient';
import { getArticleLlmProvider, getArticleModelsForPicker, resolveArticleModel } from './articleLlmConfig';

export class ArticleGenerationAIAdapter {
  async generateArticle(
    topic: string | undefined,
    tone: ArticleTone,
    length: ArticleLength,
    includeSEO: boolean,
    model: string,
    writerProfile?: WriterProfile
  ): Promise<{ brief: Brief; draft: string; final: string; modelUsed: string }> {
    const provider = getArticleLlmProvider();
    const modelUsed = resolveArticleModel(model);

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

    console.log(
      `[ArticleGen] AI_PROVIDER=${provider}, model=${modelUsed}, tone: ${tone}, length: ${length}`
    );

    const completeChat = createArticleChatCompleter(modelUsed);

    const result = await generateArticle({
      topic,
      tone,
      length,
      includeSEO,
      model: modelUsed,
      context,
      completeChat,
      writerProfile,
    });

    return { ...result, modelUsed };
  }

  static getAvailableModels() {
    return getArticleModelsForPicker();
  }
}
