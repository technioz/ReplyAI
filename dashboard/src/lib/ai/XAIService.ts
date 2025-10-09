import { AIService } from './AIServiceFactory';

export class XAIService implements AIService {
  private apiKey: string;
  private baseUrl: string = 'https://api.x.ai/v1';
  
  constructor() {
    this.apiKey = process.env.XAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('XAI_API_KEY environment variable is required');
    }
    
    if (!this.apiKey.startsWith('xai-')) {
      console.warn('XAI API key should start with "xai-" prefix. Current format:', this.apiKey.substring(0, 8) + '...');
    }
  }

  async generateReply(tweetText: string, tone: string, userContext: any = {}) {
    // Use grok-4 as default for best performance and human-like responses
    // Fallback to grok-4-fast-reasoning for cost efficiency if needed
    const model = process.env.XAI_MODEL || 'grok-4';
    
    const systemPrompt = this.buildSystemPrompt(tone, userContext?.profileContext);
    const userPrompt = this.buildUserPrompt(tweetText, tone, userContext);
    
    const requestBody = {
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
      max_tokens: 150, // Increased for more complete thoughts while staying under 280 chars
      temperature: 0.9, // Higher for more creative, varied responses (0.7-1.0 range)
      top_p: 0.95, // Nucleus sampling for diverse token selection
      // Note: frequency_penalty and presence_penalty not supported by grok models
      stream: false
    };
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Quirkly-NextJS-API/1.0.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('XAI API error:', response.status, errorData);
      
      let errorMessage = `XAI API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorData);
        if (errorJson.error) {
          errorMessage = `XAI API error: ${errorJson.error}`;
        }
        if (errorJson.message) {
          errorMessage += ` - ${errorJson.message}`;
        }
      } catch (e) {
        errorMessage = `XAI API error: ${response.status} - ${errorData}`;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Invalid response from XAI API');
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
    let systemPrompt = `You are a social media expert crafting authentic X replies that sound like real conversation. Skip the fluff and deliver value immediately.

CORE RULES - FOLLOW STRICTLY:
1. NO generic starters like "I love this", "Great point", "Spot on", "I've been there"
2. Get to the VALUE immediately - no warm-up needed
3. Write like a regular person - simple, everyday language
4. NO emojis or special characters (😊 🔥 ✨ etc.) - NEVER use them
5. Generate one-liners most of the time - be concise
6. Avoid fancy vocabulary - use words everyone knows
7. Sound human, not like a corporate bot

GOOD EXAMPLES:
❌ "I love this! Great insight about productivity tools."
✅ "Which part saves you the most time - the automation or the analytics?"

❌ "This is so relatable! 😅 Working from home can be tough."
✅ "What kills your focus more - the distractions or the lack of routine?"

❌ "Spot on! 🎯 The works on my machine problem is classic."
✅ "Bet it's an environment variable. Always is."

RESPONSE STRATEGY:
- Lead with a question, observation, or insight
- Skip introductions and get straight to the point
- One sentence is ideal, two max
- Use words like "bet", "probably", "seems like", "what if"
- Make it conversational but not chatty
- Add value through questions, data points, or fresh angles

TONE ADAPTATION:
- Professional: Direct insights, no jargon
- Casual: Like talking to a friend over coffee
- Humorous: Dry wit, no forced jokes
- Empathetic: Understanding without being preachy
- Analytical: Clear logic, plain English
- Enthusiastic: Show energy through words, not emojis
- Thoughtful: Make them think without sounding academic`;

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
    
    // Add user context if relevant
    if (userContext.preferences?.defaultTone && userContext.preferences.defaultTone !== tone) {
      prompt += `Context: User typically prefers ${userContext.preferences.defaultTone} tone but specifically requested ${tone} tone for this reply.\n\n`;
    }
    
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

  // Helper method to validate reply before returning
  private validateReply(reply: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (reply.length > 280) {
      issues.push(`Length: ${reply.length} chars (max 280)`);
    }
    
    if (reply.includes('😀') || /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(reply)) {
      issues.push('Contains emojis');
    }
    
    if (reply.startsWith('"') && reply.endsWith('"')) {
      issues.push('Reply wrapped in quotes');
    }
    
    const roboticPhrases = ['great question', 'thanks for sharing', 'i appreciate', 'interesting point'];
    const lowerReply = reply.toLowerCase();
    roboticPhrases.forEach(phrase => {
      if (lowerReply.includes(phrase)) {
        issues.push(`Contains robotic phrase: "${phrase}"`);
      }
    });
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}