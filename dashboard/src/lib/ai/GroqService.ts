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

CRITICAL - NO EMOJIS RULE:
- NEVER use any emoji characters: 😊 🔥 ✨ 🚀 💡 👍 ❤️ 🎯 etc.
- NEVER use special symbols: → • ✓ ✗ ★ ♥ ※ etc.
- Use only standard text and punctuation: . , ! ? - ' "
- Express emotion through WORDS ONLY, not symbols

OUTPUT FORMAT: 
- Return only the reply text, nothing else
- Pure text only - no emojis, no special characters
- Write as if you're a real person texting on a basic phone
- One-liner preferred, two sentences maximum`;

    return systemPrompt;
  }

  private buildUserPrompt(tweetText: string, tone: string, userContext: any): string {
    let prompt = `Reply to this X post in ${tone} tone. Get straight to the value:\n\n`;
    prompt += `"${tweetText}"\n\n`;
    
    // Add context about the post if it would help
    if (userContext.postMetadata) {
      const { hasLinks, hasMedia, isThread } = userContext.postMetadata;
      if (isThread) prompt += `(Thread)\n`;
      if (hasLinks) prompt += `(Has links)\n`;
      if (hasMedia) prompt += `(Has media)\n`;
    }
    
    prompt += `\nREMEMBER:
- NO emojis or special characters
- NO generic starters (I love this, Great point, etc)
- Simple language only
- One-liner preferred
- Direct value, no fluff`;
    
    return prompt;
  }
}