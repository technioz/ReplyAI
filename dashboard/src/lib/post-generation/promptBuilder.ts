// System Prompt Builder for Post Generation
// Builds enhanced prompts with RAG context

import { PostType, Platform } from './types';

export class SystemPromptBuilder {
  /**
   * Build complete system prompt with RAG context
   */
  buildPrompt(
    postType: PostType,
    platform: Platform,
    ragContext: string,
    userContext?: {
      topic?: string;
      trendingTopic?: string;
      technicalConcept?: string;
    }
  ): { systemPrompt: string; userPrompt: string } {
    const systemPrompt = this.buildSystemPrompt(ragContext);
    const userPrompt = this.buildUserPrompt(postType, platform, userContext);

    return { systemPrompt, userPrompt };
  }

  /**
   * Build system prompt with RAG context
   */
  private buildSystemPrompt(ragContext: string): string {
    return `You are an expert content generator for Technioz, helping create authentic personal brand content for a backend/AI automation expert serving SMEs.

${ragContext}

Generate content that follows the style, structure, and messaging from the knowledge base above. Use the examples as templates for tone, structure, and storytelling approach.`;
  }

  /**
   * Build user prompt with specific request
   */
  private buildUserPrompt(
    postType: PostType,
    platform: Platform,
    userContext?: {
      topic?: string;
      trendingTopic?: string;
      technicalConcept?: string;
    }
  ): string {
    let prompt = `Generate a ${this.formatPostTypeName(postType)} for ${platform}.\n`;

    // Add context if provided
    if (userContext?.topic) {
      prompt += `\nTopic: ${userContext.topic}`;
    }
    if (userContext?.trendingTopic) {
      prompt += `\nTrending Topic: ${userContext.trendingTopic}`;
    }
    if (userContext?.technicalConcept) {
      prompt += `\nTechnical Concept to Explain: ${userContext.technicalConcept}`;
    }

    prompt += `\n\nGenerate a ${this.formatPostTypeName(postType)} for ${platform} following the exact format and style from the knowledge base.`;



    return prompt;
  }

  /**
   * Format post type name for display
   */
  private formatPostTypeName(postType: PostType): string {
    return postType
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

