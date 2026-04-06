#!/usr/bin/env ts-node

// Knowledge Base Initialization Script
// ONE-TIME execution to process knowledge files and upload to Pinecone

import { config } from 'dotenv';
import { KnowledgeChunkProcessor } from '../src/lib/post-generation/chunkProcessor';
import { CohereEmbeddingService } from '../src/lib/post-generation/cohereService';
import { PineconeVectorService } from '../src/lib/post-generation/pineconeService';

// Load environment variables
config({ path: '.env.local' });

async function initializeKnowledgeBase() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   KNOWLEDGE BASE INITIALIZATION - ONE-TIME SETUP          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Process markdown files into chunks
    console.log('📝 STEP 1: Processing Knowledge Files');
    console.log('─────────────────────────────────────');
    
    const processor = new KnowledgeChunkProcessor();
    const chunks = await processor.processAllKnowledge();
    
    const stats = processor.getProcessingStats(chunks);
    console.log('\n📊 Processing Statistics:');
    console.log(`   Total Chunks: ${stats.total}`);
    console.log(`   By Source:`);
    console.log(`     • knowledge-base/postGenerationKnowledge.md: ${stats.bySource.postGeneration}`);
    console.log(`     • knowledge-base/OWNING_A_DESIRE_FRAMEWORK.md: ${stats.bySource.desireFramework}`);
    console.log(`   By Category:`);
    console.log(`     • Pillars: ${stats.byCategory.pillar}`);
    console.log(`     • Post Types: ${stats.byCategory.postType}`);
    console.log(`     • Writing Style: ${stats.byCategory.style}`);
    console.log(`     • Framework: ${stats.byCategory.framework}`);
    console.log(`     • Examples: ${stats.byCategory.example}`);
    console.log(`     • Hooks: ${stats.byCategory.hook}`);
    console.log(`   By Importance:`);
    console.log(`     • Critical: ${stats.byImportance.critical}`);
    console.log(`     • High: ${stats.byImportance.high}`);
    console.log(`     • Medium: ${stats.byImportance.medium}`);
    console.log(`     • Low: ${stats.byImportance.low}\n`);

    // Step 2: Generate embeddings using Cohere
    console.log('🧠 STEP 2: Generating Embeddings (Cohere)');
    console.log('─────────────────────────────────────');
    
    const cohereService = new CohereEmbeddingService();
    const chunksWithEmbeddings = await cohereService.processChunks(chunks);
    
    console.log(`✅ Generated ${chunksWithEmbeddings.length} embeddings (1024 dimensions each)\n`);

    // Step 3: Initialize Pinecone index
    console.log('📊 STEP 3: Initializing Pinecone Index');
    console.log('─────────────────────────────────────');
    
    const pineconeService = new PineconeVectorService();
    await pineconeService.initializeIndex();
    
    console.log('');

    // Step 4: Delete all existing vectors (fresh start)
    console.log('🗑️  STEP 4: Deleting All Existing Vectors');
    console.log('─────────────────────────────────────');
    
    console.log('⚠️  Removing all existing embeddings from Pinecone...');
    await pineconeService.deleteAllVectors();
    console.log('✅ All existing vectors deleted - starting fresh\n');
    
    // Wait a moment for deletion to propagate
    await sleep(2000);

    // Step 5: Upload vectors to Pinecone
    console.log('⬆️  STEP 5: Uploading New Vectors to Pinecone');
    console.log('─────────────────────────────────────');
    
    await pineconeService.upsertChunks(chunksWithEmbeddings);
    
    console.log('');

    // Step 6: Verify upload
    console.log('✅ STEP 6: Verifying Upload');
    console.log('─────────────────────────────────────');
    
    const indexStats = await pineconeService.getIndexStats();
    
    if (indexStats) {
      console.log('   Index Statistics:');
      console.log(`     • Total Vectors: ${indexStats.totalRecordCount || 0}`);
      console.log(`     • Dimension: ${indexStats.dimension || 1024}`);
      console.log(`     • Index Fullness: ${((indexStats.totalRecordCount || 0) / 1000000 * 100).toFixed(2)}%`);
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   ✅ KNOWLEDGE BASE INITIALIZATION COMPLETE!              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('🎯 Next Steps:');
    console.log('   1. Knowledge base is ready for RAG queries');
    console.log('   2. Post generation API can now retrieve context');
    console.log('   3. Test with a sample query to verify retrieval\n');

  } catch (error) {
    console.error('\n❌ ERROR: Knowledge base initialization failed');
    console.error(error);
    process.exit(1);
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Execute if run directly
if (require.main === module) {
  initializeKnowledgeBase()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { initializeKnowledgeBase };

