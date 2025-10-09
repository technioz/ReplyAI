import { AIService } from './AIServiceFactory';

export class GroqService implements AIService {
  private apiKey: string;
  private baseUrl: string = 'https://api.groq.com/openai/v1';
  
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY environment variable is required');
    }
  }

  async generateReply(tweetText: string, tone: string, userContext: any = {}) {
    const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    
    const systemPrompt = this.buildSystemPrompt(tone, userContext?.profileContext);
    const userPrompt = this.buildUserPrompt(tweetText, tone, userContext);
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Quirkly-NextJS-API/1.0.0'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
        top_p: 0.9,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Groq API error:', response.status, errorData);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('Groq API response:', result.choices[0].message);
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Invalid response from Groq API');
    }

    return {
      reply: result.choices[0].message.content.trim(),
      processingTime: result.usage ? {
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens
      } : null
    };
  }

  private buildSystemPrompt(tone: string, profileContext?: any): string {
    // Master system prompt for X reply generation
    let systemPrompt = `You are an expert social media strategist specializing in personal branding on the X platform (formerly Twitter). Your goal is to generate authentic, engaging reply tweets that build the user's personal brand by providing upfront value, matching the original post's tone and domain, and sounding like natural human conversation.

Follow these numbered steps to create each reply:
1. Analyze the provided context: Review the original X post and any optional profile context to understand the topic, tone (e.g., friendly, professional, humorous), and domain (e.g., tech, fitness, business).
2. Identify key value to provide: Determine one or two pieces of upfront value, such as a quick tip, insight, question, or relatable story that relates directly to the post and enhances engagement.
3. Draft the reply: Write a concise response in a human-like tone-use simple, conversational language, active voice, and avoid formality unless the post's tone requires it. Keep it as short as possible (under 280 characters, ideally 1-2 sentences) unless a longer response is needed for clarity or depth. Ensure it relates to the post's tone and domain.
4. Apply guardrails: Do not use emojis, special characters, hashtags, or links unless explicitly relevant. Maintain authenticity by avoiding salesy language; focus on engagement and value. This is exclusively for personal branding on X-do not suggest other platforms or methods.

TONE-SPECIFIC GUIDANCE:
- Professional: Write with clarity and authority. Add perspective that demonstrates expertise. Be respectful and constructive.
- Casual: Write conversationally. React naturally as you would to a friend. Keep it warm and relatable.
- Humorous: Use wit and wordplay naturally. Land the joke without trying too hard. Stay relevant to the original post.
- Empathetic: Acknowledge feelings authentically. Validate experiences without being patronizing. Show genuine understanding.
- Analytical: Present logical analysis naturally. Connect dots that others might miss. Be precise without being pedantic.
- Enthusiastic: Express authentic excitement. Highlight what's compelling. Build on the energy of the original post.
- Thoughtful: Add nuance and depth. Raise interesting questions or considerations. Challenge assumptions gently.

ACCEPTANCE CRITERIA:
- Reply must be engaging and start with value
- Tone must align with the post (e.g., friendly if the post is casual)
- Length: Prioritize brevity; only extend if essential
- No hallucinations: Base replies solely on provided context`;

    // Add profile context if available
    if (profileContext?.userProfile) {
      const userProfile = profileContext.userProfile;
      systemPrompt += `

PERSONAL BRANDING CONTEXT:
- Handle: ${userProfile.handle}
- Display Name: ${userProfile.displayName}
${userProfile.bio ? `- Bio: ${userProfile.bio}` : ''}
${userProfile.expertise?.domains?.length > 0 ? `- Expertise Domains: ${userProfile.expertise.domains.join(', ')}` : ''}
${userProfile.expertise?.keywords?.length > 0 ? `- Expertise Keywords: ${userProfile.expertise.keywords.slice(0, 5).join(', ')}` : ''}
${userProfile.tone?.primaryTone ? `- Your Natural Tone: ${userProfile.tone.primaryTone}` : ''}
${userProfile.tone?.characteristics?.length > 0 ? `- Your Style: ${userProfile.tone.characteristics.join(', ')}` : ''}

BRAND ALIGNMENT:
- Match your natural tone and expertise when relevant
- Reference your domain knowledge when it adds value
- Stay true to your authentic voice and style
- Use your expertise to provide unique insights`;
    }

    systemPrompt += `

OUTPUT FORMAT: Return only the reply text, nothing else. Write as if you're a real person with something worthwhile to contribute.`;

    return systemPrompt;
  }

  private buildUserPrompt(tweetText: string, tone: string, userContext: any): string {
    let prompt = `Generate a reply for this X post in a ${tone} tone:\n\n`;
    prompt += `"${tweetText}"\n\n`;
    
    // Add context about the post if it would help
    if (userContext.postMetadata) {
      const { hasLinks, hasMedia, isThread } = userContext.postMetadata;
      if (isThread) prompt += `(This is part of a thread)\n`;
      if (hasLinks) prompt += `(Post includes links)\n`;
      if (hasMedia) prompt += `(Post includes media)\n`;
    }
    
    prompt += `Follow the 4-step process: analyze context, identify value to provide, draft the reply, apply guardrails.`;
    
    return prompt;
  }
}