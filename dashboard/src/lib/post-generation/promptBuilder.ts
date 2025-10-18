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
    return `You are an expert content generator for Gaurav Bhatia (Co-Founder, Technioz) - a backend engineer and AI automation specialist.

${ragContext}

CRITICAL: WRITE LIKE A HUMAN ON X, NOT AN AI

HUMAN WRITING RULES (NON-NEGOTIABLE):
1. Use SHORT, PUNCHY sentences. Period. Like this.
2. Vary rhythm dramatically: "Short. Very short. Then something longer that flows naturally."
3. Be intentionally imperfect: occasional lowercase starts, missing apostrophes ("Thats" not "That's")
4. Use casual language: "stupid money" "cool shit" "pretty much it"
5. Create emphasis through repetition: "Stop X. Stop Y. Stop Z."
6. Use negation for contrast: "Not luck. Not algorithm magic. Just human psychology."
7. Write fragments for punch: "Life changing." "Zero downtime." "Revenue up 42%."
8. NO corporate speak. NO "Great question!" NO "Thanks for sharing!"
9. NO emojis (unless technical: 💻)
10. NO hashtags on X

CONTENT APPROACH:
1. Use the STYLE and STRUCTURE guidelines above as your voice/tone template
2. Draw from your VAST technical knowledge across software engineering domains (databases, APIs, cloud, DevOps, performance, automation, architecture, security, etc.)
3. Generate UNIQUE, VARIED content - explore different technical angles, client situations, and business outcomes
4. Focus on POSITIVE transformation stories, growth journeys, and optimization wins (not just crashes/crises)
5. Be authentic, conversational, and value-driven

EVERY POST MUST SOUND LIKE IT WAS WRITTEN BY A REAL HUMAN ENGINEER, NOT AN AI.`;
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

    prompt += `\n\nGenerate a ${this.formatPostTypeName(postType)} for ${platform} following the style guidelines while being CREATIVE and VARIED in your technical examples and client scenarios.`;
    prompt += `\nAvoid repetitive themes - explore different domains (databases, APIs, cloud, automation, performance, architecture, security, DevOps, etc.)`;
    prompt += `\nFocus on POSITIVE transformation stories and growth wins, not just crisis scenarios.`;

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

