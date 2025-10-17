// Post Generation Service
// Main orchestrator for RAG-based post generation

import { RAGService } from './ragService';
import { SystemPromptBuilder } from './promptBuilder';
import { PostType, Platform, PostGenerationRequest, PostGenerationResponse } from './types';

export class PostGenerationService {
  private ragService: RAGService;
  private promptBuilder: SystemPromptBuilder;

  constructor() {
    this.ragService = new RAGService();
    this.promptBuilder = new SystemPromptBuilder();
  }

  /**
   * Get RAG context and prompts for post generation
   * Returns prompts that can be used by the API route
   */
  async prepareGeneration(request: PostGenerationRequest): Promise<{
    systemPrompt: string;
    userPrompt: string;
    ragContext: string;
  }> {
    try {
      // Step 1: Retrieve relevant knowledge context from RAG
      const ragContext = await this.ragService.retrieveContext(
        request.postType,
        request.context
      );

      // Step 2: Build enhanced prompts with RAG context
      const { systemPrompt, userPrompt } = this.promptBuilder.buildPrompt(
        request.postType,
        request.platform,
        ragContext,
        request.context
      );

      return {
        systemPrompt,
        userPrompt,
        ragContext
      };

    } catch (error) {
      console.error('Post generation preparation error:', error);
      throw new Error(`Failed to prepare generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate generated content quality
   */
  validateContent(content: string, postType: PostType): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check for forbidden elements
    // Simple emoji detection - checks for common emojis
    const hasEmojis = /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(content) || 
                      content.includes('🚀') || 
                      content.includes('💡') ||
                      content.includes('🎯') ||
                      content.includes('✨') ||
                      content.includes('📈');
    
    if (hasEmojis) {
      issues.push('Contains emojis (forbidden)');
    }

    if (content.toLowerCase().includes('leverage') || 
        content.toLowerCase().includes('synergize') ||
        content.toLowerCase().includes('paradigm shift')) {
      issues.push('Contains corporate speak');
    }

    if (content.includes('Great question!') ||
        content.includes('Thanks for sharing') ||
        content.includes('I appreciate')) {
      issues.push('Contains AI-sounding phrases');
    }

    // Check for required elements
    const hasNumbers = /\d+%|\d+\s*(hours?|days?|months?|years?)|₹\d+/.test(content);
    if (!hasNumbers && (postType === 'value-bomb-thread' || postType === 'client-story-thread')) {
      issues.push('Missing specific numbers/metrics');
    }

    // Check length for X platform
    const lines = content.split('\n').filter(l => l.trim());
    if (postType.includes('thread')) {
      const tweets = lines.filter(l => l.startsWith('Tweet'));
      if (tweets.length < 3) {
        issues.push('Thread too short (needs at least 3 tweets)');
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Extract metadata from generated content
   */
  extractMetadata(content: string, postType: PostType, platform: Platform): PostGenerationResponse['metadata'] {
    // Detect which pillar the content references
    let pillar: any = 'manual-processes-revenue-leaks'; // default
    
    if (content.toLowerCase().includes('automation') && 
        (content.toLowerCase().includes('survival') || content.toLowerCase().includes('expense'))) {
      pillar = 'automation-survival';
    } else if (content.toLowerCase().includes('system') && 
               (content.toLowerCase().includes('sleep') || content.toLowerCase().includes('24/7'))) {
      pillar = 'systems-work-while-sleep';
    }

    // Count characters and tweets
    const characterCount = content.length;
    const tweetCount = postType.includes('thread') 
      ? (content.match(/Tweet \d+/g) || []).length 
      : undefined;

    // Determine hook type
    let hookType = 'problem-statement';
    const firstLine = content.split('\n')[0]?.toLowerCase() || '';
    
    if (firstLine.includes('most') && firstLine.includes('wrong')) {
      hookType = 'counterintuitive';
    } else if (firstLine.match(/\d+ ?(am|pm)/)) {
      hookType = 'story-opening';
    } else if (firstLine.includes('every') || firstLine.includes('pattern')) {
      hookType = 'pattern-recognition';
    } else if (firstLine.match(/\d+%|\d+ clients/)) {
      hookType = 'data-results';
    }

    return {
      postType,
      pillar,
      platform,
      characterCount,
      tweetCount,
      estimatedEngagement: this.estimateEngagement(postType),
      hookType
    };
  }

  /**
   * Estimate engagement potential
   */
  private estimateEngagement(postType: PostType): string {
    const engagementMap: Record<PostType, string> = {
      'value-bomb-thread': 'High (educational content performs well)',
      'client-story-thread': 'Very High (transformation stories resonate)',
      'contrarian-take': 'High (sparks debate and shares)',
      'pattern-recognition': 'Medium-High (thought leadership)',
      'personal-journey': 'Medium (builds connection)',
      'engagement-question': 'Medium-High (designed for replies)',
      'educational-deep-dive': 'High (valuable technical content)'
    };

    return engagementMap[postType] || 'Medium';
  }
}

