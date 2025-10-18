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
      
      // Search for similar chunks in Pinecone (reduced to 3 for token efficiency)
      const searchResults = await this.pineconeService.searchSimilar(queryEmbedding, 3);
      
      // Build context from retrieved chunks (focus on HOW to write, not WHAT to write)
      const context = this.buildFocusedContext(searchResults, postType);
      
      return context;
      
    } catch (error) {
      console.error('RAG retrieval error:', error);
      throw new Error(`Failed to retrieve context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build semantic query from post type and context
   * FOCUS: Writing style, tone, structure - NOT technical content
   */
  private buildSemanticQuery(
    postType: PostType,
    userContext?: {
      topic?: string;
      trendingTopic?: string;
      technicalConcept?: string;
    }
  ): string {
    // Ultra-specific query for STYLE and STRUCTURE only
    const styleQuery = [
      `How to write ${postType.replace(/-/g, ' ')} in authentic conversational tone`,
      `sentence structure and paragraph flow for ${postType}`,
      `voice authenticity patterns and engagement hooks`
    ].join(', ');

    return styleQuery;
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
   * Build FOCUSED context - prioritizes writing style over technical content
   * Dramatically reduces token usage while maintaining authenticity
   */
  private buildFocusedContext(results: RAGSearchResult[], postType: PostType): string {
    if (results.length === 0) {
      return 'No specific context retrieved. Use your authentic voice and technical expertise.';
    }

    const sections: string[] = [];
    
    // Group results by category
    const grouped = this.groupByCategory(results);

    // ONLY include the most essential writing guidance
    // Priority 1: Post type structure (if available)
    if (grouped.postType && grouped.postType.length > 0) {
      sections.push('## POST STRUCTURE TEMPLATE\n');
      // Take ONLY the first result
      sections.push(grouped.postType[0].content);
      sections.push('\n');
    }

    // Priority 2: Writing style (if available)
    if (grouped.style && grouped.style.length > 0) {
      sections.push('## AUTHENTIC VOICE PATTERNS\n');
      sections.push(grouped.style[0].content);
      sections.push('\n');
    }

    // Priority 3: Hook formula (if available)
    if (grouped.hook && grouped.hook.length > 0) {
      sections.push('## ENGAGEMENT HOOK\n');
      sections.push(grouped.hook[0].content);
      sections.push('\n');
    }

    // Add diversity instruction
    sections.push('\n## IMPORTANT INSTRUCTION\n');
    sections.push('Generate UNIQUE and VARIED content. Draw from the vast knowledge of software engineering (databases, APIs, automation, infrastructure, performance optimization, system architecture, DevOps, cloud, security, etc.).');
    sections.push('\nAvoid repetitive scenarios. Each post should explore a different angle, client situation, or technical domain.');
    sections.push('\nFocus on POSITIVE transformations and growth stories, not just crisis/crash scenarios.');

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

