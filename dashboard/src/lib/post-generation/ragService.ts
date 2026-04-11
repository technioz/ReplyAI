import { CohereEmbeddingService } from './cohereService';
import { PineconeVectorService } from './pineconeService';
import { RAGSearchResult } from './types';

export class RAGService {
  private cohereService: CohereEmbeddingService;
  private pineconeService: PineconeVectorService;

  constructor() {
    this.cohereService = new CohereEmbeddingService();
    this.pineconeService = new PineconeVectorService();
  }

  async retrieveContext(
    topic?: string
  ): Promise<string> {
    try {
      const query = this.buildSemanticQuery(topic);
      const queryEmbedding = await this.cohereService.generateQueryEmbedding(query);
      const searchResults = await this.pineconeService.searchSimilar(queryEmbedding, 3);
      const context = this.buildFocusedContext(searchResults);
      return context;
    } catch (error) {
      console.error('RAG retrieval error:', error);
      throw new Error(`Failed to retrieve context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildSemanticQuery(topic?: string): string {
    const styleQuery = [
      'authentic conversational tone for social media post',
      'sentence structure and paragraph flow',
      'voice authenticity patterns and engagement hooks',
      topic ? `specific angle: ${topic}` : ''
    ].filter(Boolean).join(', ');

    return styleQuery;
  }

  private buildFocusedContext(results: RAGSearchResult[]): string {
    if (results.length === 0) {
      return 'No specific context retrieved. Use your authentic voice and technical expertise.';
    }

    const sections: string[] = [];
    const grouped = this.groupByCategory(results);

    if (grouped.style && grouped.style.length > 0) {
      sections.push('## AUTHENTIC VOICE PATTERNS\n');
      sections.push(grouped.style[0].content);
      sections.push('\n');
    }

    if (grouped.hook && grouped.hook.length > 0) {
      sections.push('## ENGAGEMENT HOOK\n');
      sections.push(grouped.hook[0].content);
      sections.push('\n');
    }

    if (grouped.framework && grouped.framework.length > 0) {
      sections.push('## STRATEGIC FRAMEWORKS\n');
      sections.push(grouped.framework[0].content);
      sections.push('\n');
    }

    return sections.join('\n');
  }

  private groupByCategory(results: RAGSearchResult[]): Record<string, RAGSearchResult[]> {
    const grouped: Record<string, RAGSearchResult[]> = {};
    results.forEach(result => {
      const category = result.metadata.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(result);
    });
    return grouped;
  }
}