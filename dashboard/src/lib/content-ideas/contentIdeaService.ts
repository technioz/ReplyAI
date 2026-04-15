import { BraveSearchService } from '../post-generation/braveSearchService';
import { generatePostGenerationChat } from '../ai/openaiCompatibleChat';
import { buildIdeasSystemPrompt, buildIdeasUserPrompt } from './promptBuilder';
import type { ContentIdea, ContentIdeaRequest, ContentIdeaResponse, WriterProfile } from './types';

function extractJsonFromResponse(raw: string): string {
  const trimmed = raw.trim();

  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return trimmed;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export class ContentIdeaService {
  private braveSearch: BraveSearchService;

  constructor() {
    this.braveSearch = new BraveSearchService();
  }

  async generateIdeas(
    request: ContentIdeaRequest,
    writerProfile?: WriterProfile
  ): Promise<ContentIdeaResponse> {
    let trendingContext: string | undefined;
    let trendingUsed = false;

    const searchTerm = this.buildSearchTerm(request, writerProfile);
    if (searchTerm && this.braveSearch.isEnabled()) {
      console.log(`[ContentIdeas] Fetching trending context for: "${searchTerm}"`);
      const context = await this.braveSearch.fetchTopicContext(searchTerm, request.platform || 'X');
      if (context) {
        trendingContext = context;
        trendingUsed = true;
      }
    }

    const systemPrompt = buildIdeasSystemPrompt(writerProfile);
    const userPrompt = buildIdeasUserPrompt(request, trendingContext);

    console.log('[ContentIdeas] Calling AI for idea generation...');

    const responseText = await generatePostGenerationChat(systemPrompt, userPrompt);

    const jsonStr = extractJsonFromResponse(responseText);
    let parsed: { ideas?: ContentIdea[] };

    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('[ContentIdeas] Failed to parse AI response as JSON:', responseText.substring(0, 500));
      throw new Error('AI returned invalid JSON for content ideas');
    }

    if (!parsed.ideas || !Array.isArray(parsed.ideas) || parsed.ideas.length === 0) {
      throw new Error('AI returned no content ideas');
    }

    const ideas: ContentIdea[] = parsed.ideas.map((idea: ContentIdea, index: number) => ({
      id: idea.id || generateId(),
      title: idea.title || `Idea ${index + 1}`,
      hook: idea.hook || '',
      angle: idea.angle || '',
      format: idea.format || 'post',
      platform: idea.platform || ['X'],
      urgency: idea.urgency || 'evergreen',
      topicTag: idea.topicTag || 'general',
      reasoning: idea.reasoning || '',
    }));

    return {
      ideas,
      profileUsed: !!writerProfile,
      trendingTopicsUsed: trendingUsed,
    };
  }

  private buildSearchTerm(request: ContentIdeaRequest, profile?: WriterProfile): string {
    const parts: string[] = [];

    if (request.focusArea) {
      parts.push(request.focusArea);
    }

    if (profile?.expertise?.topics?.length) {
      parts.push(profile.expertise.topics.slice(0, 3).join(' '));
    }

    if (profile?.expertise?.keywords?.length) {
      parts.push(profile.expertise.keywords.slice(0, 3).join(' '));
    }

    if (parts.length === 0) {
      parts.push('tech AI automation devops trending');
    }

    return parts.join(' ') + ' trending discussions 2025';
  }
}