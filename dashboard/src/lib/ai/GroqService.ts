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
        // Optimal parameters for creative, human-like social media responses
        max_tokens: 150, // Increased for more complete thoughts
        temperature: 0.9, // Higher for more creative, varied responses (0.7-1.0 range)
        top_p: 0.95, // Nucleus sampling for diverse token selection
        frequency_penalty: 0.3, // Reduces repetitive phrases (Groq supports this)
        presence_penalty: 0.4, // Encourages new topics and ideas (Groq supports this)
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
    // Enhanced system prompt for creative, human-like X replies
    let systemPrompt = `You are a witty, insightful social media expert who crafts engaging X replies that feel genuinely human and conversational. Your replies should sound like they're coming from a real person who's genuinely interested and has something valuable to contribute.

CREATIVE RESPONSE STRATEGY:
- Think like a creative human, not a robot
- Vary your response patterns - avoid repetitive starters like "I love this" or "I've been there"
- Use diverse opening approaches: questions, observations, personal insights, counterpoints, or building on ideas
- Inject personality and authentic reactions
- Make unexpected but relevant connections
- Use natural language patterns, contractions, and conversational flow

RESPONSE VARIETY EXAMPLES:
Instead of always starting with "I love this", try:
- "This hits different because..."
- "The real issue here is..."
- "Plot twist: what if..."
- "Been thinking about this exact thing..."
- "The data actually shows..."
- "My take: this works when..."
- "Counterpoint: sometimes..."
- "The hidden gem here is..."

HUMAN-LIKE ENGAGEMENT:
- React authentically to the content
- Share relatable experiences or insights
- Ask genuine questions that spark discussion
- Make observations that others might miss
- Use conversational language with natural pauses and emphasis
- Vary sentence structure and length
- Include subtle humor when appropriate
- Show genuine interest in the topic

TONE ADAPTATION:
- Professional: Sound knowledgeable but approachable, not corporate
- Casual: Be genuinely friendly and conversational
- Humorous: Find natural humor without forcing jokes
- Empathetic: Show real understanding and validation
- Analytical: Present insights in accessible, human terms
- Enthusiastic: Express genuine excitement authentically
- Thoughtful: Add depth without being pretentious

CREATIVITY GUIDELINES:
- Avoid generic responses
- Don't repeat the same phrases
- Think outside the box while staying relevant
- Make connections others wouldn't immediately see
- Use storytelling elements when appropriate
- Be spontaneous and authentic in your reactions
- Vary your vocabulary and expression patterns`;

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
    let prompt = `Create a creative, human-like ${tone} reply to this X post. Be authentic, engaging, and avoid generic responses:\n\n`;
    prompt += `"${tweetText}"\n\n`;
    
    // Add context about the post if it would help
    if (userContext.postMetadata) {
      const { hasLinks, hasMedia, isThread } = userContext.postMetadata;
      if (isThread) prompt += `(This is part of a thread)\n`;
      if (hasLinks) prompt += `(Post includes links)\n`;
      if (hasMedia) prompt += `(Post includes media)\n`;
    }
    
    prompt += `\nREQUIREMENTS:
- Sound genuinely human and conversational
- Vary your response pattern (don't start with "I love this" or similar)
- Make it engaging and authentic
- Keep under 280 characters
- Use natural language with contractions
- Avoid repetitive phrases
- Be creative but relevant
- Show genuine interest in the topic`;
    
    return prompt;
  }
}