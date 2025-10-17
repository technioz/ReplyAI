// Pinecone Vector Database Service
// Stores and retrieves knowledge embeddings for RAG

import { Pinecone } from '@pinecone-database/pinecone';
import { KnowledgeChunk, RAGSearchResult } from './types';

export class PineconeVectorService {
  private client: Pinecone;
  private indexName: string;
  private dimension: number = 1024; // Cohere embed-english-v3.0 dimension

  constructor() {
    const apiKey = process.env.PINECONE_API_KEY;
    
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY environment variable is required');
    }

    this.client = new Pinecone({
      apiKey: apiKey
    });

    this.indexName = process.env.PINECONE_INDEX_NAME || 'quirkly-knowledge-base';
  }

  /**
   * Initialize Pinecone index (run once)
   */
  async initializeIndex(): Promise<void> {
    try {
      console.log(`🔍 Checking if index '${this.indexName}' exists...`);
      
      // Check if index already exists
      const indexes = await this.client.listIndexes();
      const indexExists = indexes.indexes?.some(idx => idx.name === this.indexName);

      if (indexExists) {
        console.log(`✅ Index '${this.indexName}' already exists`);
        return;
      }

      console.log(`📊 Creating new index '${this.indexName}'...`);
      
      // Create new index
      await this.client.createIndex({
        name: this.indexName,
        dimension: this.dimension,
        metric: 'cosine', // Best for semantic similarity
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });

      console.log(`✅ Index '${this.indexName}' created successfully`);
      
      // Wait for index to be ready
      await this.waitForIndexReady();
      
    } catch (error) {
      console.error('Error initializing Pinecone index:', error);
      throw new Error(`Failed to initialize Pinecone index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Wait for index to be ready
   */
  private async waitForIndexReady(): Promise<void> {
    console.log('⏳ Waiting for index to be ready...');
    
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const indexStats = await this.getIndexStats();
        if (indexStats) {
          console.log('✅ Index is ready');
          return;
        }
      } catch (error) {
        // Index not ready yet, continue waiting
      }

      attempts++;
      await this.sleep(2000); // Wait 2 seconds between checks
    }

    throw new Error('Index initialization timeout');
  }

  /**
   * Upsert knowledge chunks to Pinecone
   */
  async upsertChunks(chunks: KnowledgeChunk[]): Promise<void> {
    try {
      const index = this.client.index(this.indexName);
      
      // Prepare vectors for upsert
      const vectors = chunks.map(chunk => {
        if (!chunk.embedding) {
          throw new Error(`Chunk ${chunk.id} missing embedding`);
        }

        return {
          id: chunk.id,
          values: chunk.embedding,
          metadata: {
            content: chunk.content,
            source: chunk.metadata.source,
            category: chunk.metadata.category,
            subcategory: chunk.metadata.subcategory || '',
            pillar: chunk.metadata.pillar || '',
            postType: chunk.metadata.postType || '',
            keywords: JSON.stringify(chunk.metadata.keywords),
            importance: chunk.metadata.importance
          }
        };
      });

      // Batch upsert (Pinecone recommends batches of 100)
      const BATCH_SIZE = 100;
      
      for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
        const batch = vectors.slice(i, i + BATCH_SIZE);
        
        console.log(`⬆️  Upserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(vectors.length / BATCH_SIZE)} (${batch.length} vectors)`);
        
        await index.upsert(batch);
        
        // Small delay between batches
        if (i + BATCH_SIZE < vectors.length) {
          await this.sleep(500);
        }
      }

      console.log(`✅ Successfully upserted ${vectors.length} vectors to Pinecone`);
      
    } catch (error) {
      console.error('Error upserting chunks to Pinecone:', error);
      throw new Error(`Failed to upsert chunks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for similar knowledge chunks
   */
  async searchSimilar(
    queryEmbedding: number[],
    topK: number = 5,
    filter?: any
  ): Promise<RAGSearchResult[]> {
    try {
      const index = this.client.index(this.indexName);
      
      const searchResults = await index.query({
        vector: queryEmbedding,
        topK,
        filter,
        includeMetadata: true
      });

      const results: RAGSearchResult[] = searchResults.matches.map(match => ({
        id: match.id,
        score: match.score || 0,
        content: match.metadata?.content as string,
        metadata: {
          source: match.metadata?.source,
          category: match.metadata?.category,
          subcategory: match.metadata?.subcategory,
          pillar: match.metadata?.pillar,
          postType: match.metadata?.postType,
          keywords: match.metadata?.keywords ? JSON.parse(match.metadata.keywords as string) : [],
          importance: match.metadata?.importance
        }
      }));

      return results;
      
    } catch (error) {
      console.error('Pinecone search error:', error);
      throw new Error(`Failed to search Pinecone: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get index statistics
   */
  async getIndexStats(): Promise<any> {
    try {
      const index = this.client.index(this.indexName);
      const stats = await index.describeIndexStats();
      return stats;
    } catch (error) {
      console.error('Error getting index stats:', error);
      return null;
    }
  }

  /**
   * Delete all vectors (for re-initialization)
   */
  async deleteAllVectors(): Promise<void> {
    try {
      const index = this.client.index(this.indexName);
      await index.deleteAll();
      console.log('✅ Deleted all vectors from index');
    } catch (error) {
      console.error('Error deleting vectors:', error);
      throw new Error(`Failed to delete vectors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

