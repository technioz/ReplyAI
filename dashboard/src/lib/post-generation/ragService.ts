// RAG Service - Retrieval Augmented Generation
// Retrieves relevant knowledge chunks and builds context for LLM

import { CohereEmbeddingService } from './cohereService';
import { PineconeVectorService } from './pineconeService';
import { PostType, RAGSearchResult } from './types';

export class RAGService {
  private cohereService: CohereEmbeddingService;
  private pineconeService: PineconeVectorService;

  constructor() {
    this.cohereService = new CohereEmbeddingService();
    this.pineconeService = new PineconeVectorService();
  }

  /**
   * Retrieve relevant knowledge context for post generation
   */
  async retrieveContext(
    postType: PostType,
    userContext?: {
      topic?: string;
      trendingTopic?: string;
      technicalConcept?: string;
    }
  ): Promise<string> {
    try {
      // Build semantic query
      const query = this.buildSemanticQuery(postType, userContext);
      
      // Generate query embedding
      const queryEmbedding = await this.cohereService.generateQueryEmbedding(query);
      
      // Search for similar chunks in Pinecone
      const searchResults = await this.pineconeService.searchSimilar(queryEmbedding, 10);
      
      // Build context from retrieved chunks
      const context = this.buildEnhancedContext(searchResults, postType);
      
      return context;
      
    } catch (error) {
      console.error('RAG retrieval error:', error);
      throw new Error(`Failed to retrieve context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build semantic query from post type and context
   */
  private buildSemanticQuery(
    postType: PostType,
    userContext?: {
      topic?: string;
      trendingTopic?: string;
      technicalConcept?: string;
    }
  ): string {
    const parts: string[] = [];

    // Add post type
    parts.push(`${postType.replace(/-/g, ' ')} post structure and template`);

    // Add specific context
    if (userContext?.topic) {
      parts.push(`about ${userContext.topic}`);
    }
    if (userContext?.trendingTopic) {
      parts.push(`related to ${userContext.trendingTopic}`);
    }
    if (userContext?.technicalConcept) {
      parts.push(`explaining ${userContext.technicalConcept}`);
    }

    // Add general requirements
    parts.push('with real examples and business outcomes');
    parts.push('emphasizing freedom from operational chaos');

    return parts.join(' ');
  }

  /**
   * Build enhanced context from retrieved chunks
   */
  private buildEnhancedContext(results: RAGSearchResult[], postType: PostType): string {
    const sections: string[] = [];

    // Group results by category
    const grouped = this.groupByCategory(results);

    // 1. Add post type structure (highest priority)
    if (grouped.postType && grouped.postType.length > 0) {
      sections.push('## POST TYPE STRUCTURE AND TEMPLATE\n');
      grouped.postType.forEach(result => {
        sections.push(result.content);
        sections.push('\n---\n');
      });
    }

    // 2. Add relevant pillar(s)
    if (grouped.pillar && grouped.pillar.length > 0) {
      sections.push('## RELEVANT DIFFERENTIATION PILLAR(S)\n');
      grouped.pillar.forEach(result => {
        sections.push(result.content);
        sections.push('\n---\n');
      });
    }

    // 3. Add writing style guidelines
    if (grouped.style && grouped.style.length > 0) {
      sections.push('## WRITING STYLE REQUIREMENTS\n');
      grouped.style.forEach(result => {
        sections.push(result.content);
        sections.push('\n---\n');
      });
    }

    // 4. Add client examples for social proof
    if (grouped.example && grouped.example.length > 0) {
      sections.push('## CLIENT SUCCESS EXAMPLES (For Reference)\n');
      grouped.example.forEach(result => {
        sections.push(result.content);
        sections.push('\n---\n');
      });
    }

    // 5. Add hook formulas
    if (grouped.hook && grouped.hook.length > 0) {
      sections.push('## HOOK FORMULAS AND ENGAGEMENT STRATEGIES\n');
      grouped.hook.forEach(result => {
        sections.push(result.content);
        sections.push('\n---\n');
      });
    }

    // 6. Add framework guidance (Freedom/Desire framework)
    if (grouped.framework && grouped.framework.length > 0) {
      sections.push('## STRATEGIC FRAMEWORKS\n');
      grouped.framework.forEach(result => {
        sections.push(result.content);
        sections.push('\n---\n');
      });
    }

    return sections.join('\n');
  }

  /**
   * Group results by category
   */
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

  /**
   * Get retrieval statistics for debugging
   */
  getRetrievalStats(results: RAGSearchResult[]) {
    return {
      totalResults: results.length,
      avgScore: results.reduce((sum, r) => sum + r.score, 0) / results.length,
      categories: this.groupByCategory(results),
      topResult: results[0] ? {
        category: results[0].metadata.category,
        score: results[0].score,
        preview: results[0].content.substring(0, 100)
      } : null
    };
  }
}

