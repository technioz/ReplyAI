// Knowledge Chunk Processor
// Parses markdown files into semantic chunks for RAG

import fs from 'fs';
import path from 'path';
import { KnowledgeChunk, Pillar, PostType } from './types';

export class KnowledgeChunkProcessor {
  private projectRoot: string;

  constructor() {
    // Project root is one level up from dashboard directory
    this.projectRoot = path.join(process.cwd(), '..');
  }

  /**
   * Main method: Process all knowledge files into chunks
   */
  async processAllKnowledge(): Promise<KnowledgeChunk[]> {
    const chunks: KnowledgeChunk[] = [];

    // Process profileContext.md (NEW - Personal brand identity)
    const profileChunks = await this.processProfileContext();
    chunks.push(...profileChunks);

    // Process postGenerationKnowledge.md
    const postGenChunks = await this.processPostGenerationKnowledge();
    chunks.push(...postGenChunks);

    // Process OWNING_A_DESIRE_FRAMEWORK.md
    const desireChunks = await this.processDesireFramework();
    chunks.push(...desireChunks);

    // Process backendEngineeringKnowledge.md (NEW - Technical knowledge base)
    const backendChunks = await this.processBackendEngineering();
    chunks.push(...backendChunks);

    // Process humanBehaviour.md (NEW - Human writing style patterns)
    const humanBehaviourChunks = await this.processHumanBehaviour();
    chunks.push(...humanBehaviourChunks);

    console.log(`✅ Processed ${chunks.length} total knowledge chunks`);
    
    return chunks;
  }

  /**
   * Process profileContext.md - Personal brand and identity
   */
  private async processProfileContext(): Promise<KnowledgeChunk[]> {
    const filePath = path.join(this.projectRoot, 'profileContext.md');
    
    if (!fs.existsSync(filePath)) {
      console.warn('⚠️  profileContext.md not found, skipping');
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const chunks: KnowledgeChunk[] = [];
    let chunkId = 0;

    // Core identity chunk (always retrieved)
    const identity = this.extractSection(content, '## Personal Identity', '## Professional Background');
    if (identity) {
      chunks.push({
        id: `profile-${chunkId++}`,
        content: `## PERSONAL IDENTITY\n${identity}`,
        metadata: {
          source: 'profileContext',
          category: 'profile',
          subcategory: 'identity',
          keywords: ['identity', 'personal', 'brand'],
          importance: 'critical'
        }
      });
    }

    // Technical expertise chunk
    const expertise = this.extractSection(content, '### Technical Expertise', '### Technioz - Company Focus');
    if (expertise) {
      chunks.push({
        id: `profile-${chunkId++}`,
        content: `## TECHNICAL EXPERTISE\n${expertise}`,
        metadata: {
          source: 'profileContext',
          category: 'profile',
          subcategory: 'expertise',
          keywords: ['expertise', 'technical', 'backend', 'ai', 'automation'],
          importance: 'critical'
        }
      });
    }

    // Target audience and positioning
    const audience = this.extractSection(content, '## Target Audience', '## Brand Positioning');
    const positioning = this.extractSection(content, '## Brand Positioning', '## Voice and Tone');
    if (audience && positioning) {
      chunks.push({
        id: `profile-${chunkId++}`,
        content: `## TARGET AUDIENCE\n${audience}\n\n## POSITIONING\n${positioning}`,
        metadata: {
          source: 'profileContext',
          category: 'profile',
          subcategory: 'audience-positioning',
          keywords: ['audience', 'positioning', 'sme', 'gcc', 'india'],
          importance: 'high'
        }
      });
    }

    // Voice and tone (for style consistency)
    const voice = this.extractSection(content, '## Voice and Tone', '## Content Themes');
    if (voice) {
      chunks.push({
        id: `profile-${chunkId++}`,
        content: `## VOICE AND TONE\n${voice}`,
        metadata: {
          source: 'profileContext',
          category: 'style',
          subcategory: 'voice',
          keywords: ['voice', 'tone', 'style', 'writing'],
          importance: 'critical'
        }
      });
    }

    console.log(`✅ Extracted ${chunks.length} chunks from profileContext.md`);
    return chunks;
  }

  /**
   * Process postGenerationKnowledge.md
   */
  private async processPostGenerationKnowledge(): Promise<KnowledgeChunk[]> {
    const filePath = path.join(this.projectRoot, 'postGenerationKnowledge.md');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const chunks: KnowledgeChunk[] = [];
    let chunkId = 0;

    // Extract Brand Identity section
    const brandIdentity = this.extractSection(content, '## BRAND IDENTITY', '## THREE DIFFERENTIATION PILLARS');
    if (brandIdentity) {
      chunks.push({
        id: `post-gen-${chunkId++}`,
        content: brandIdentity,
        metadata: {
          source: 'postGeneration',
          category: 'framework',
          subcategory: 'brand-identity',
          keywords: ['brand', 'identity', 'technioz', 'expertise', 'target-audience', 'SME', 'GCC', 'India'],
          importance: 'critical'
        }
      });
    }

    // Extract Three Pillars (each pillar as separate chunk)
    const pillar1 = this.extractSection(content, '### Pillar 1: Manual Processes = Revenue Leaks', '### Pillar 2:');
    if (pillar1) {
      chunks.push({
        id: `post-gen-${chunkId++}`,
        content: pillar1,
        metadata: {
          source: 'postGeneration',
          category: 'pillar',
          pillar: 'manual-processes-revenue-leaks',
          keywords: ['manual', 'processes', 'revenue', 'leaks', 'inefficiency', 'automation'],
          importance: 'critical'
        }
      });
    }

    const pillar2 = this.extractSection(content, '### Pillar 2: Automation Isn\'t Expense, It\'s Survival', '### Pillar 3:');
    if (pillar2) {
      chunks.push({
        id: `post-gen-${chunkId++}`,
        content: pillar2,
        metadata: {
          source: 'postGeneration',
          category: 'pillar',
          pillar: 'automation-survival',
          keywords: ['automation', 'survival', 'expense', 'ROI', 'competitive', 'advantage'],
          importance: 'critical'
        }
      });
    }

    const pillar3 = this.extractSection(content, '### Pillar 3: Build Systems That Work While You Sleep', '## CONTENT STRATEGY FRAMEWORK');
    if (pillar3) {
      chunks.push({
        id: `post-gen-${chunkId++}`,
        content: pillar3,
        metadata: {
          source: 'postGeneration',
          category: 'pillar',
          pillar: 'systems-work-while-sleep',
          keywords: ['systems', 'automation', '24/7', 'scalability', 'freedom', 'leverage'],
          importance: 'critical'
        }
      });
    }

    // Extract Post Type structures
    const postTypes: Array<{name: string, id: PostType}> = [
      { name: '### 1. VALUE BOMB THREAD', id: 'value-bomb-thread' },
      { name: '### 2. CLIENT STORY THREAD', id: 'client-story-thread' },
      { name: '### 3. CONTRARIAN TAKE', id: 'contrarian-take' },
      { name: '### 4. PATTERN RECOGNITION POST', id: 'pattern-recognition' },
      { name: '### 5. PERSONAL JOURNEY / WAR STORY', id: 'personal-journey' },
      { name: '### 6. ENGAGEMENT QUESTION POST', id: 'engagement-question' },
      { name: '### 7. EDUCATIONAL DEEP-DIVE THREAD', id: 'educational-deep-dive' }
    ];

    postTypes.forEach((type, index) => {
      const nextSection = index < postTypes.length - 1 ? postTypes[index + 1].name : '## WRITING STYLE GUIDELINES';
      const postTypeContent = this.extractSection(content, type.name, nextSection);
      
      if (postTypeContent) {
        chunks.push({
          id: `post-gen-${chunkId++}`,
          content: postTypeContent,
          metadata: {
            source: 'postGeneration',
            category: 'postType',
            postType: type.id,
            keywords: [type.id.replace(/-/g, ' '), 'structure', 'template', 'format'],
            importance: 'critical'
          }
        });
      }
    });

    // Extract Writing Style Guidelines
    const writingStyle = this.extractSection(content, '## WRITING STYLE GUIDELINES', '## CLIENT EXAMPLES AND CASE STUDIES');
    if (writingStyle) {
      chunks.push({
        id: `post-gen-${chunkId++}`,
        content: writingStyle,
        metadata: {
          source: 'postGeneration',
          category: 'style',
          subcategory: 'aaron-will-style',
          keywords: ['writing', 'style', 'tone', 'voice', 'short', 'punchy', 'hook'],
          importance: 'critical'
        }
      });
    }

    // Extract Client Examples
    const clientExamples = this.extractSection(content, '## CLIENT EXAMPLES AND CASE STUDIES', '## ENGAGEMENT STRATEGY');
    if (clientExamples) {
      // Split client examples into individual chunks
      const exampleSections = clientExamples.split(/\d+\.\s+/g).filter(s => s.trim().length > 100);
      
      exampleSections.forEach((example) => {
        if (example.trim()) {
          chunks.push({
            id: `post-gen-${chunkId++}`,
            content: example.trim(),
            metadata: {
              source: 'postGeneration',
              category: 'example',
              subcategory: 'client-story',
              keywords: this.extractKeywordsFromText(example),
              importance: 'high'
            }
          });
        }
      });
    }

    // Extract Hook Formulas
    const hookFormulas = this.extractSection(content, '## HOOK FORMULAS (CRITICAL)', '## AUTHORITY POSITIONING');
    if (hookFormulas) {
      chunks.push({
        id: `post-gen-${chunkId++}`,
        content: hookFormulas,
        metadata: {
          source: 'postGeneration',
          category: 'hook',
          subcategory: 'hook-formulas',
          keywords: ['hook', 'opening', 'engagement', 'first-10-words', 'attention'],
          importance: 'critical'
        }
      });
    }

    // Extract Common Mistakes to Avoid
    const mistakes = this.extractSection(content, '## COMMON MISTAKES TO AVOID', '## METRICS AND OPTIMIZATION');
    if (mistakes) {
      chunks.push({
        id: `post-gen-${chunkId++}`,
        content: mistakes,
        metadata: {
          source: 'postGeneration',
          category: 'framework',
          subcategory: 'mistakes-to-avoid',
          keywords: ['mistakes', 'avoid', 'errors', 'pitfalls', 'best-practices'],
          importance: 'high'
        }
      });
    }

    console.log(`✅ Extracted ${chunks.length} chunks from postGenerationKnowledge.md`);
    return chunks;
  }

  /**
   * Process OWNING_A_DESIRE_FRAMEWORK.md
   */
  private async processDesireFramework(): Promise<KnowledgeChunk[]> {
    const filePath = path.join(this.projectRoot, 'OWNING_A_DESIRE_FRAMEWORK.md');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const chunks: KnowledgeChunk[] = [];
    let chunkId = 1000; // Start from 1000 to avoid ID conflicts

    // Extract Core Principle
    const corePrinciple = this.extractSection(content, '### Core Principle', '## The Framework Structure');
    if (corePrinciple) {
      chunks.push({
        id: `desire-${chunkId++}`,
        content: corePrinciple,
        metadata: {
          source: 'desireFramework',
          category: 'framework',
          subcategory: 'core-desire',
          keywords: ['desire', 'freedom', 'owning', 'positioning', 'brand'],
          importance: 'critical'
        }
      });
    }

    // Extract Application to Technioz Brand
    const techniozApplication = this.extractSection(content, '## Application to Technioz Brand', '## Content Strategy Integration');
    if (techniozApplication) {
      chunks.push({
        id: `desire-${chunkId++}`,
        content: techniozApplication,
        metadata: {
          source: 'desireFramework',
          category: 'framework',
          subcategory: 'brand-positioning',
          keywords: ['freedom', 'operational-chaos', 'SME', 'positioning', 'pillars'],
          importance: 'critical'
        }
      });
    }

    // Extract Content Strategy Integration
    const contentStrategy = this.extractSection(content, '## Content Strategy Integration', '## Implementation Rules for Content Generation');
    if (contentStrategy) {
      chunks.push({
        id: `desire-${chunkId++}`,
        content: contentStrategy,
        metadata: {
          source: 'desireFramework',
          category: 'framework',
          subcategory: 'content-strategy',
          keywords: ['freedom', 'outcomes', 'transformation', 'desire', 'hook'],
          importance: 'critical'
        }
      });
    }

    // Extract Implementation Rules
    const implementationRules = this.extractSection(content, '## Implementation Rules for Content Generation', '## Integration with Existing Frameworks');
    if (implementationRules) {
      chunks.push({
        id: `desire-${chunkId++}`,
        content: implementationRules,
        metadata: {
          source: 'desireFramework',
          category: 'framework',
          subcategory: 'implementation-rules',
          keywords: ['desire-first', 'freedom', 'emotional', 'anchor', 'embody'],
          importance: 'critical'
        }
      });
    }

    // Extract Story Angle Examples
    const storyAngles = this.extractSection(content, '### Story Angle Examples', '## Implementation Rules for Content Generation');
    if (storyAngles) {
      chunks.push({
        id: `desire-${chunkId++}`,
        content: storyAngles,
        metadata: {
          source: 'desireFramework',
          category: 'example',
          subcategory: 'story-angles',
          keywords: ['freedom', 'transformation', 'before-after', 'outcomes'],
          importance: 'high'
        }
      });
    }

    console.log(`✅ Extracted ${chunks.length} chunks from OWNING_A_DESIRE_FRAMEWORK.md`);
    return chunks;
  }

  /**
   * Process backendEngineeringKnowledge.md - Technical knowledge base
   */
  private async processBackendEngineering(): Promise<KnowledgeChunk[]> {
    const filePath = path.join(this.projectRoot, 'backendEngineeringKnowledge.md');
    
    if (!fs.existsSync(filePath)) {
      console.warn('⚠️  backendEngineeringKnowledge.md not found, skipping');
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const chunks: KnowledgeChunk[] = [];
    let chunkId = 2000; // Start from 2000 to avoid ID conflicts

    // Major sections to extract
    const sections: Array<{ heading: string; category: 'technical' | 'example'; subcategory: string }> = [
      { heading: '## Database Engineering & Optimization', category: 'technical', subcategory: 'database' },
      { heading: '### Relational Databases (SQL)', category: 'technical', subcategory: 'sql-databases' },
      { heading: '### NoSQL Databases', category: 'technical', subcategory: 'nosql-databases' },
      { heading: '### Database Design Patterns', category: 'technical', subcategory: 'database-design' },
      { heading: '## API Development & Architecture', category: 'technical', subcategory: 'api' },
      { heading: '### RESTful API Design', category: 'technical', subcategory: 'rest-api' },
      { heading: '### GraphQL APIs', category: 'technical', subcategory: 'graphql' },
      { heading: '### gRPC & Protocol Buffers', category: 'technical', subcategory: 'grpc' },
      { heading: '## System Architecture & Design', category: 'technical', subcategory: 'architecture' },
      { heading: '### Microservices Architecture', category: 'technical', subcategory: 'microservices' },
      { heading: '### Message Queues & Streaming', category: 'technical', subcategory: 'message-queues' },
      { heading: '## Performance & Scalability', category: 'technical', subcategory: 'performance' },
      { heading: '### Caching Strategies', category: 'technical', subcategory: 'caching' },
      { heading: '### Load Balancing', category: 'technical', subcategory: 'load-balancing' },
      { heading: '## Cloud Infrastructure', category: 'technical', subcategory: 'cloud' },
      { heading: '### AWS Services', category: 'technical', subcategory: 'aws' },
      { heading: '## DevOps & CI/CD', category: 'technical', subcategory: 'devops' },
      { heading: '### Containerization', category: 'technical', subcategory: 'docker' },
      { heading: '### CI/CD Pipelines', category: 'technical', subcategory: 'cicd' },
      { heading: '### Monitoring & Observability', category: 'technical', subcategory: 'monitoring' },
      { heading: '## Security & Authentication', category: 'technical', subcategory: 'security' },
      { heading: '### Authentication Mechanisms', category: 'technical', subcategory: 'authentication' },
      { heading: '### Authorization', category: 'technical', subcategory: 'authorization' },
      { heading: '## Real-World Implementation Scenarios', category: 'example', subcategory: 'implementation' },
      { heading: '## Performance Optimization Case Studies', category: 'example', subcategory: 'optimization' },
      { heading: '## Common Backend Challenges & Solutions', category: 'example', subcategory: 'challenges' }
    ];

    // Extract each major section as a chunk
    for (let i = 0; i < sections.length; i++) {
      const currentSection = sections[i];
      const nextSection = i < sections.length - 1 ? sections[i + 1] : null;
      
      let sectionContent: string | null;
      if (nextSection) {
        sectionContent = this.extractSection(content, currentSection.heading, nextSection.heading);
      } else {
        // Last section - extract to end of file
        const startIndex = content.indexOf(currentSection.heading);
        if (startIndex !== -1) {
          sectionContent = content.substring(startIndex).trim();
        } else {
          sectionContent = null;
        }
      }
      
      if (sectionContent && sectionContent.length > 200) {
        // For very large sections (>3000 chars), split them into smaller chunks
        if (sectionContent.length > 3000) {
          const subchunks = this.splitLargeSection(sectionContent, 2000);
          subchunks.forEach((subchunk, index) => {
            chunks.push({
              id: `backend-${chunkId++}`,
              content: subchunk,
              metadata: {
                source: 'backendEngineering',
                category: currentSection.category,
                subcategory: `${currentSection.subcategory}-${index + 1}`,
                keywords: this.extractTechnicalKeywords(subchunk),
                importance: currentSection.category === 'example' ? 'high' : 'medium'
              }
            });
          });
        } else {
          chunks.push({
            id: `backend-${chunkId++}`,
            content: sectionContent,
            metadata: {
              source: 'backendEngineering',
              category: currentSection.category,
              subcategory: currentSection.subcategory,
              keywords: this.extractTechnicalKeywords(sectionContent),
              importance: currentSection.category === 'example' ? 'high' : 'medium'
            }
          });
        }
      }
    }

    console.log(`✅ Extracted ${chunks.length} chunks from backendEngineeringKnowledge.md`);
    return chunks;
  }

  /**
   * Split large section into smaller chunks
   */
  private splitLargeSection(content: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const lines = content.split('\n');
    let currentChunk = '';

    for (const line of lines) {
      if (currentChunk.length + line.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        // Keep the current line as start of next chunk if it's a heading
        if (line.startsWith('#')) {
          currentChunk = line + '\n';
        } else {
          currentChunk = '';
        }
      } else {
        currentChunk += line + '\n';
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Extract technical keywords from backend engineering content
   */
  private extractTechnicalKeywords(text: string): string[] {
    const keywords: string[] = [];
    const lowerText = text.toLowerCase();

    // Database keywords
    const dbKeywords = ['postgresql', 'mysql', 'mongodb', 'redis', 'dynamodb', 'cassandra', 
                       'indexing', 'query optimization', 'sql', 'nosql', 'database'];
    
    // API keywords
    const apiKeywords = ['rest', 'graphql', 'grpc', 'api', 'webhook', 'endpoint', 
                        'authentication', 'authorization', 'jwt'];
    
    // Architecture keywords
    const archKeywords = ['microservices', 'monolith', 'serverless', 'architecture', 
                         'event-driven', 'message queue', 'kafka', 'rabbitmq'];
    
    // Performance keywords
    const perfKeywords = ['caching', 'cdn', 'load balancing', 'scaling', 'performance', 
                         'optimization', 'latency', 'throughput'];
    
    // Cloud keywords
    const cloudKeywords = ['aws', 'azure', 'gcp', 'cloud', 'lambda', 's3', 'ec2', 
                          'kubernetes', 'docker', 'container'];
    
    // DevOps keywords
    const devopsKeywords = ['ci/cd', 'jenkins', 'github actions', 'deployment', 'monitoring', 
                           'logging', 'observability', 'prometheus', 'grafana'];
    
    // Security keywords
    const securityKeywords = ['security', 'encryption', 'oauth', 'jwt', 'authentication', 
                             'authorization', 'rbac', 'tls', 'ssl'];

    const allKeywords = [...dbKeywords, ...apiKeywords, ...archKeywords, ...perfKeywords, 
                        ...cloudKeywords, ...devopsKeywords, ...securityKeywords];

    allKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        keywords.push(keyword);
      }
    });

    return Array.from(new Set(keywords));
  }

  /**
   * Process humanBehaviour.md - Human writing style patterns for X
   */
  private async processHumanBehaviour(): Promise<KnowledgeChunk[]> {
    const filePath = path.join(this.projectRoot, 'humanBehaviour.md');
    
    if (!fs.existsSync(filePath)) {
      console.warn('⚠️  humanBehaviour.md not found, skipping');
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const chunks: KnowledgeChunk[] = [];
    let chunkId = 3000; // Start from 3000 to avoid ID conflicts

    // Extract major sections
    const sections = [
      { heading: '## Category 1: Short, Punchy Wisdom', endHeading: '## Category 2:', category: 'style', subcategory: 'punchy-wisdom' },
      { heading: '## Category 2: The Hook + Insight Pattern', endHeading: '## Category 3:', category: 'style', subcategory: 'hook-insight' },
      { heading: '## Category 3: Thread Starter / Teaser Pattern', endHeading: '## Category 4:', category: 'style', subcategory: 'thread-starter' },
      { heading: '## Category 4: Technical/Educational (Still Human)', endHeading: '## Category 5:', category: 'style', subcategory: 'technical-human' },
      { heading: '## Category 5: Quote/Reframe Pattern', endHeading: '## Key Human Writing Patterns', category: 'style', subcategory: 'quote-reframe' },
      { heading: '## Key Human Writing Patterns Observed:', endHeading: '## LLM Training Prompt', category: 'style', subcategory: 'human-patterns' },
      { heading: '## LLM Training Prompt Based on These Samples:', endHeading: null, category: 'style', subcategory: 'llm-training-rules' }
    ];

    for (const section of sections) {
      let sectionContent: string | null;
      
      if (section.endHeading) {
        sectionContent = this.extractSection(content, section.heading, section.endHeading);
      } else {
        // Last section - extract to end
        const startIndex = content.indexOf(section.heading);
        if (startIndex !== -1) {
          sectionContent = content.substring(startIndex).trim();
        } else {
          sectionContent = null;
        }
      }

      if (sectionContent && sectionContent.length > 100) {
        chunks.push({
          id: `human-behaviour-${chunkId++}`,
          content: sectionContent,
          metadata: {
            source: 'profileContext', // Group with style guidance
            category: 'style',
            subcategory: section.subcategory,
            keywords: this.extractHumanStyleKeywords(sectionContent),
            importance: 'critical' // This is CRITICAL for authentic voice
          }
        });
      }
    }

    console.log(`✅ Extracted ${chunks.length} chunks from humanBehaviour.md`);
    return chunks;
  }

  /**
   * Extract keywords from human behaviour content
   */
  private extractHumanStyleKeywords(text: string): string[] {
    const keywords: string[] = [];
    const lowerText = text.toLowerCase();

    const styleKeywords = [
      'human', 'authentic', 'casual', 'conversational', 'punchy', 
      'lowercase', 'fragments', 'rhythm', 'imperfection', 'typo',
      'hook', 'thread', 'teaser', 'pattern', 'style', 'voice',
      'short sentences', 'repetition', 'emphasis', 'natural'
    ];

    styleKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        keywords.push(keyword);
      }
    });

    return Array.from(new Set(keywords));
  }

  /**
   * Extract section between two headings
   */
  private extractSection(content: string, startHeading: string, endHeading: string): string | null {
    const startIndex = content.indexOf(startHeading);
    if (startIndex === -1) return null;

    const endIndex = content.indexOf(endHeading, startIndex + startHeading.length);
    if (endIndex === -1) {
      // No end heading, take until end of document
      return content.substring(startIndex).trim();
    }

    return content.substring(startIndex, endIndex).trim();
  }

  /**
   * Extract keywords from text content
   */
  private extractKeywordsFromText(text: string): string[] {
    const keywords: string[] = [];
    
    // Common technical keywords
    const techKeywords = [
      'database', 'api', 'redis', 'postgresql', 'nodejs', 'laravel',
      'caching', 'automation', 'chatbot', 'booking', 'payment',
      'performance', 'optimization', 'scaling', 'rate-limiting'
    ];

    // Business keywords
    const businessKeywords = [
      'revenue', 'roi', 'cost', 'savings', 'growth', 'efficiency',
      'manual', 'automated', 'freedom', 'time', 'scalability'
    ];

    // Geographic keywords
    const geoKeywords = [
      'dubai', 'gcc', 'india', 'uae', 'saudi', 'restaurant', 'fintech', 'ecommerce'
    ];

    const allKeywords = [...techKeywords, ...businessKeywords, ...geoKeywords];
    const lowerText = text.toLowerCase();

    allKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        keywords.push(keyword);
      }
    });

    return Array.from(new Set(keywords)); // Remove duplicates
  }

  /**
   * Get statistics about processed chunks
   */
  getProcessingStats(chunks: KnowledgeChunk[]) {
    const stats = {
      total: chunks.length,
      bySource: {
        postGeneration: chunks.filter(c => c.metadata.source === 'postGeneration').length,
        desireFramework: chunks.filter(c => c.metadata.source === 'desireFramework').length
      },
      byCategory: {
        pillar: chunks.filter(c => c.metadata.category === 'pillar').length,
        postType: chunks.filter(c => c.metadata.category === 'postType').length,
        style: chunks.filter(c => c.metadata.category === 'style').length,
        framework: chunks.filter(c => c.metadata.category === 'framework').length,
        example: chunks.filter(c => c.metadata.category === 'example').length,
        hook: chunks.filter(c => c.metadata.category === 'hook').length
      },
      byImportance: {
        critical: chunks.filter(c => c.metadata.importance === 'critical').length,
        high: chunks.filter(c => c.metadata.importance === 'high').length,
        medium: chunks.filter(c => c.metadata.importance === 'medium').length,
        low: chunks.filter(c => c.metadata.importance === 'low').length
      }
    };

    return stats;
  }
}

