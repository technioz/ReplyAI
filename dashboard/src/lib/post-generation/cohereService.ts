// Cohere Embedding Service
// Converts text chunks into vector embeddings for RAG

import { CohereClient } from 'cohere-ai';
import { KnowledgeChunk } from './types';

export class CohereEmbeddingService {
  private client: CohereClient;
  private model: string;

  constructor() {
    const apiKey = process.env.COHERE_API_KEY;
    
    if (!apiKey) {
      throw new Error('COHERE_API_KEY environment variable is required');
    }

    this.client = new CohereClient({
      token: apiKey
    });

    this.model = process.env.COHERE_MODEL || 'embed-english-v3.0';
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embed({
        texts: [text],
        model: this.model,
        inputType: 'search_document', // For indexing documents
        embeddingTypes: ['float']
      });

      if (!response.embeddings || !response.embeddings.float || response.embeddings.float.length === 0) {
        throw new Error('No embeddings returned from Cohere API');
      }

      return response.embeddings.float[0];
    } catch (error) {
      console.error('Cohere embedding error:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * Cohere supports up to 96 texts per request
   */
  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    const BATCH_SIZE = 96; // Cohere's limit
    const embeddings: number[][] = [];

    try {
      // Process in batches
      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)} (${batch.length} texts)`);

        const response = await this.client.embed({
          texts: batch,
          model: this.model,
          inputType: 'search_document',
          embeddingTypes: ['float']
        });

        if (!response.embeddings || !response.embeddings.float) {
          throw new Error('No embeddings returned from Cohere API');
        }

        embeddings.push(...response.embeddings.float);

        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < texts.length) {
          await this.sleep(100);
        }
      }

      return embeddings;
    } catch (error) {
      console.error('Batch embedding error:', error);
      throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process knowledge chunks and add embeddings
   */
  async processChunks(chunks: KnowledgeChunk[]): Promise<KnowledgeChunk[]> {
    console.log(`🧠 Generating embeddings for ${chunks.length} chunks...`);
    
    const texts = chunks.map(chunk => chunk.content);
    const embeddings = await this.batchGenerateEmbeddings(texts);

    const chunksWithEmbeddings = chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index]
    }));

    console.log(`✅ Generated ${embeddings.length} embeddings`);
    
    return chunksWithEmbeddings;
  }

  /**
   * Generate embedding for a search query
   * Uses 'search_query' input type for optimal retrieval
   */
  async generateQueryEmbedding(queryText: string): Promise<number[]> {
    try {
      const response = await this.client.embed({
        texts: [queryText],
        model: this.model,
        inputType: 'search_query', // Optimized for search queries
        embeddingTypes: ['float']
      });

      if (!response.embeddings || !response.embeddings.float || response.embeddings.float.length === 0) {
        throw new Error('No embeddings returned from Cohere API');
      }

      return response.embeddings.float[0];
    } catch (error) {
      console.error('Query embedding error:', error);
      throw new Error(`Failed to generate query embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get embedding dimensions for this model
   */
  getEmbeddingDimension(): number {
    // Cohere embed-english-v3.0 produces 1024-dimensional vectors
    return 1024;
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

