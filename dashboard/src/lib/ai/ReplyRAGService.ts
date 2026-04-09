// Reply RAG Service - Lightweight RAG for reply generation
// Retrieves writing style patterns and contrarian takes from knowledge base
// This is EXPERIMENTAL - can be disabled via REPLY_USE_RAG env var

import { CohereEmbeddingService } from '../post-generation/cohereService';
import { PineconeVectorService } from '../post-generation/pineconeService';

export interface ReplyRAGContext {
  writingStyle: string;
  contrarianTakes: string[];
  humanPatterns: string;
}

export class ReplyRAGService {
  private cohereService: CohereEmbeddingService;
  private pineconeService: PineconeVectorService;

  constructor() {
    this.cohereService = new CohereEmbeddingService();
    this.pineconeService = new PineconeVectorService();
  }

  /**
   * Check if RAG is enabled for replies
   */
  static isEnabled(): boolean {
    return process.env.REPLY_USE_RAG === 'true';
  }

  /**
   * Retrieve relevant context for reply generation
   * Focus: Writing style patterns, contrarian angles, human-like phrasing
   */
  async retrieveReplyContext(tweetText: string, tone: string): Promise<ReplyRAGContext | null> {
    try {
      // Build query focused on style and contrarian takes
      const query = this.buildReplyQuery(tweetText, tone);
      
      // Generate embedding
      const queryEmbedding = await this.cohereService.generateQueryEmbedding(query);
      
      // Search for relevant chunks (limit to 3 for speed)
      const searchResults = await this.pineconeService.searchSimilar(queryEmbedding, 3);
      
      if (searchResults.length === 0) {
        console.log('[ReplyRAG] No context found, using base prompt');
        return null;
      }

      // Build context
      const context = this.buildReplyContext(searchResults, tone);
      
      console.log('[ReplyRAG] Retrieved context:', {
        chunks: searchResults.length,
        topScore: searchResults[0]?.score,
        categories: searchResults.map(r => r.metadata.category)
      });

      return context;
      
    } catch (error) {
      console.error('[ReplyRAG] Retrieval error:', error);
      // Fail gracefully - return null to continue without RAG
      return null;
    }
  }

  /**
   * Build semantic query for reply context
   */
  private buildReplyQuery(tweetText: string, tone: string): string {
    // Extract key themes from tweet
    const keyThemes = tweetText
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(word => word.length > 3)
      .slice(0, 5)
      .join(' ');

    return `contrarian take on ${keyThemes}, casual reply style, authentic voice, layman language`;
  }

  /**
   * Build reply-specific context from retrieved chunks
   */
  private buildReplyContext(results: any[], tone: string): ReplyRAGContext {
    const contrarianTakes: string[] = [];
    let writingStyle = '';
    let humanPatterns = '';

    results.forEach(result => {
      const content = result.content;
      const category = result.metadata.category;

      // Extract contrarian takes (look for disagreement patterns)
      if (category === 'contrarian' || content.includes('actually') || content.includes('nah') || content.includes('not really')) {
        contrarianTakes.push(content.substring(0, 200));
      }

      // Extract writing style (look for voice/style guidance)
      if (category === 'style' || content.includes('voice') || content.includes('tone')) {
        writingStyle = content.substring(0, 300);
      }

      // Extract human patterns (look for examples)
      if (category === 'example' || category === 'human') {
        humanPatterns = content.substring(0, 250);
      }
    });

    return {
      writingStyle: writingStyle || 'Use simple, casual language. Short sentences.',
      contrarianTakes: contrarianTakes.length > 0 ? contrarianTakes : ['Offer a different angle.'],
      humanPatterns: humanPatterns || 'Write like texting a friend.'
    };
  }

  /**
   * Format RAG context for injection into system prompt
   */
  static formatContextForPrompt(context: ReplyRAGContext | null): string {
    if (!context) return '';

    const parts: string[] = [];
    
    if (context.contrarianTakes.length > 0) {
      parts.push('Contrarian angles to consider:');
      context.contrarianTakes.forEach((take, i) => {
        parts.push(`${i + 1}. "${take}"`);
      });
    }

    if (context.writingStyle) {
      parts.push(`\nWriting style reference: ${context.writingStyle}`);
    }

    if (context.humanPatterns) {
      parts.push(`\nHuman voice example: ${context.humanPatterns}`);
    }

    return parts.length > 0 ? `\n\n[CONTEXT]\n${parts.join('\n')}` : '';
  }
}
