import type { ContentIdea, WriterProfile } from './types';

export function buildIdeasSystemPrompt(profile?: WriterProfile): string {
  let prompt = `You are a viral content strategist who understands what makes content spread online.

You generate content ideas that are deeply personal to the writer's expertise, experience, and perspective. Every idea must be something only THIS specific person could write credibly.

YOU NEVER:
- Suggest generic topics like "The future of AI" or "Why automation matters"
- Propose listicles without a sharp contrarian angle
- Recommend topics that anyone with a pulse could write
- Use AI cliches (delve, landscape, tapestry, leverage, robust, furthermore)
- Suggest topics detached from the writer's actual lived experience

YOU ALWAYS:
- Find the friction point where the writer's expertise clashes with popular opinion
- Build hooks from real failures, real war stories, real numbers
- Think about what's trending RIGHT NOW that intersects with the writer's domain
- Make each idea feel like it could ONLY come from this specific person
- Consider what their audience is struggling with at this exact moment

Return ONLY valid JSON. No backticks. No commentary.

Schema:
{
  "ideas": [
    {
      "id": "string (short kebab-case)",
      "title": "string (attention-grabbing, 6-12 words)",
      "hook": "string (the opening line that stops the scroll, 1-2 sentences)",
      "angle": "string (the unique perspective ONLY this writer brings, 2-3 sentences)",
      "format": "post | article | thread | both",
      "platform": ["X" | "LinkedIn"],
      "urgency": "viral | timely | evergreen",
      "topicTag": "string (short tag like 'devops', 'ai-cost', 'vps-setup')",
      "reasoning": "string (why this will resonate NOW, 1-2 sentences)"
    }
  ]
}

Generate 6 ideas. Mix urgency levels, formats, and platforms.`;

  if (profile) {
    prompt += '\n\n========================================\nWRITER PROFILE\n========================================\n';

    if (profile.displayName || profile.handle) {
      prompt += `Writer: ${profile.displayName || ''}${profile.handle ? ` (@${profile.handle})` : ''}\n`;
    }

    if (profile.bio) {
      prompt += `Bio: ${profile.bio}\n`;
    }

    if (profile.expertise) {
      const e = profile.expertise;
      if (e.domains?.length) prompt += `Expertise domains: ${e.domains.join(', ')}\n`;
      if (e.keywords?.length) prompt += `Expertise keywords: ${e.keywords.join(', ')}\n`;
      if (e.topics?.length) prompt += `Expertise topics: ${e.topics.join(', ')}\n`;
    }

    if (profile.toneAnalysis) {
      const t = profile.toneAnalysis;
      if (t.primaryTone) prompt += `Primary tone: ${t.primaryTone}\n`;
      if (t.secondaryTones?.length) prompt += `Secondary tones: ${t.secondaryTones.join(', ')}\n`;
      if (t.vocabulary?.length) prompt += `Vocabulary markers: ${t.vocabulary.join(', ')}\n`;
    }

    if (profile.writingSamples?.length) {
      prompt += '\nACTUAL WRITING SAMPLES:\n';
      for (const sample of profile.writingSamples.slice(0, 5)) {
        prompt += `> ${sample}\n`;
      }
    }

    prompt += '\nCRITICAL: Every idea must draw from this profile. If the writer is a DevOps engineer, do not suggest marketing tips. If they write about cost optimization, do not suggest brand-building fluff. The ideas must be rooted in what this person actually does and knows.';
  }

  return prompt;
}

export function buildIdeasUserPrompt(
  request?: { platform?: 'X' | 'LinkedIn'; focusArea?: string },
  trendingContext?: string
): string {
  let prompt = 'Generate 6 content ideas';

  if (request?.platform) {
    prompt += ` for ${request.platform === 'X' ? 'X/Twitter' : 'LinkedIn'}`;
  }

  if (request?.focusArea) {
    prompt += ` focused on: ${request.focusArea}`;
  }

  prompt += '.\n\nThe ideas should be a mix of:\n';
  prompt += '- 1-2 viral ideas tied to current trending discussions\n';
  prompt += '- 2-3 timely ideas related to ongoing industry shifts\n';
  prompt += '- 1-2 evergreen ideas drawn from deep expertise\n';
  prompt += '- At least 1 idea suitable for long-form article format\n';
  prompt += '- At least 1 idea that takes a contrarian or unpopular stance\n';

  if (trendingContext) {
    prompt += '\n========================================\nTRENDING CONTEXT (from live web search)\n========================================\n';
    prompt += trendingContext;
    prompt += '\n\nUse this context to identify what people are talking about RIGHT NOW. Find intersections between these trending topics and the writer\'s expertise. The best ideas sit at the crossroads of "what everyone is discussing" and "what only this writer can say about it".';
  }

  prompt += '\n\nReturn ONLY the JSON. No explanation. No markdown fences.';

  return prompt;
}