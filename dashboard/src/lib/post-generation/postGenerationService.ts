import { SystemPromptBuilder } from './promptBuilder';
import { BraveSearchService } from './braveSearchService';
import { Platform, PostGenerationResponse, RepurposeRequest } from './types';

export class PostGenerationService {
  private promptBuilder: SystemPromptBuilder;
  private braveSearch: BraveSearchService;

  constructor() {
    this.promptBuilder = new SystemPromptBuilder();
    this.braveSearch = new BraveSearchService();
  }

  async prepareGeneration(request: {
    platform: Platform;
    context?: {
      topic?: string;
      trendingTopic?: string;
      technicalConcept?: string;
    };
  }): Promise<{
    systemPrompt: string;
    userPrompt: string;
  }> {
    const topic = request.context?.topic || request.context?.trendingTopic || request.context?.technicalConcept;

    let topicContext: string | null = null;
    if (topic && this.braveSearch.isEnabled()) {
      topicContext = await this.braveSearch.fetchTopicContext(topic, request.platform);
    }

    const { systemPrompt, userPrompt } = this.promptBuilder.buildPrompt(
      request.platform,
      request.context,
      topicContext || undefined
    );

    return { systemPrompt, userPrompt };
  }

  prepareRepurpose(request: RepurposeRequest): {
    systemPrompt: string;
    userPrompt: string;
  } {
    return this.promptBuilder.buildRepurposePrompt(request);
  }

  validateContent(content: string): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    const hasEmojis = /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(content) ||
      content.includes('\u{1F680}') ||
      content.includes('\u{1F4A1}') ||
      content.includes('\u{1F3AF}') ||
      content.includes('\u{2728}') ||
      content.includes('\u{1F4C8}');

    if (hasEmojis) {
      issues.push('Contains emojis (forbidden)');
    }

    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('leverage') ||
      lowerContent.includes('synergize') ||
      lowerContent.includes('paradigm shift')) {
      issues.push('Contains corporate speak');
    }

    if (content.includes('Great question!') ||
      content.includes('Thanks for sharing') ||
      content.includes('I appreciate')) {
      issues.push('Contains AI-sounding phrases');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  extractMetadata(content: string, platform: Platform): PostGenerationResponse['metadata'] {
    const characterCount = content.length;

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
      platform,
      characterCount,
      hookType
    };
  }
}