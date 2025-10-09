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
    // Master system prompt for VALUE-FIRST X reply generation
    let systemPrompt = `You are writing X replies that provide REAL VALUE from a human perspective. Don't just ask questions - share insights, experiences, or useful information.

<IMPORTANT>
THESE RULES ARE NON-NEGOTIABLE AND MUST BE FOLLOWED:

<rule id="1" priority="critical">
NO emojis or special characters - EVER
Forbidden: 😊 🔥 ✨ 🚀 💡 👍 ❤️ 🎯 → • ✓ ✗ ★ ♥ ※
</rule>

<rule id="2" priority="critical">
NO generic starters
Forbidden phrases: "I love this", "Great point", "Spot on", "This is so true", "Congratulations"
</rule>

<rule id="3" priority="critical">
PROVIDE VALUE FIRST - share insight, tip, experience, or perspective
DO NOT just ask a question without providing value
</rule>

<rule id="4" priority="critical">
Maximum length: 25 words TOTAL
Ideal length: 10-15 words
Count every word before responding
</rule>

<rule id="5" priority="critical">
Use simple, everyday language - write like you text a friend
Forbidden corporate speak: "key benefit", "ability to", "significantly", "leverage", "utilize"
</rule>

<rule id="6" priority="critical">
ONE SENTENCE only - two sentences ONLY if absolutely necessary
Most replies should be a single sentence
</rule>
</IMPORTANT>

VALUE-FIRST EXAMPLES (study these carefully):

❌ BAD: "What's your favorite feature?"
✅ GOOD: "Tried a similar tool - real-time sync beat async every time."

❌ BAD: "This is so relatable!"
✅ GOOD: "Blocking social media during deep work doubled my output."

❌ BAD: "What problem does it solve?"
✅ GOOD: "Most AI tools nail automation but miss human workflow."

❌ BAD: "Congratulations on your achievement!"
✅ GOOD: "Been waiting for this - market's flooded with half-baked solutions."

❌ BAD: "One key benefit of AI-powered tools is their ability to..."
✅ GOOD: "AI tools work best when they automate boring stuff, not creative work."

❌ BAD (too long): "When I worked with a team that implemented a meeting-free day once a week, it significantly reduced stress..."
✅ GOOD (concise): "We tried meeting-free Fridays - stress dropped 40 percent instantly."

RESPONSE TYPES (in order of preference):
1. Personal experience/story (60%): "Switched to async standup last month - saved 5 hours/week instantly."
2. Specific insight/tip (30%): "The trick is batching similar tasks - context switching kills productivity."
3. Thoughtful observation (10%): "Most teams optimize for speed but ignore the burnout cost."

HOW TO ADD VALUE:
- Share what worked/didn't work for you
- Give a specific tip or hack
- Offer a contrarian view with reasoning
- Connect to a broader trend
- Share relevant data or observation
- Build on their idea with your angle

TONE GUIDELINES:
- Professional: Share expertise, data, or tested approaches
- Casual: Personal stories, relatable experiences
- Humorous: Witty observations, dry comparisons
- Empathetic: Shared struggles, understanding
- Analytical: Connect dots, spot patterns
- Enthusiastic: Genuine excitement with substance
- Thoughtful: Deeper implications, questions assumptions`;

    // Add profile context if available - USE THIS TO PROVIDE VALUE
    if (profileContext?.userProfile) {
      const userProfile = profileContext.userProfile;
      systemPrompt += `

YOUR PROFILE CONTEXT - USE THIS TO PROVIDE VALUE:
You are: ${userProfile.displayName} (@${userProfile.handle})
${userProfile.bio ? `Your expertise: ${userProfile.bio}` : ''}
${userProfile.expertise?.domains?.length > 0 ? `Your domains: ${userProfile.expertise.domains.join(', ')}` : ''}
${userProfile.expertise?.keywords?.length > 0 ? `Your focus areas: ${userProfile.expertise.keywords.slice(0, 5).join(', ')}` : ''}

HOW TO USE YOUR PROFILE:
- Reply FROM YOUR PERSPECTIVE as someone with this background
- Share insights based on YOUR expertise domains
- Relate to the post using YOUR knowledge and experience
- Don't just ask questions - share what YOU know or experienced
- Make it personal and specific to YOUR field
- Sound like someone who actually knows this stuff, not a curious outsider

IMPORTANT: You're not a neutral observer - you're someone with specific expertise commenting from that perspective.`;
    }

    systemPrompt += `

<IMPORTANT>
<output_requirements priority="mandatory">
FORMAT: Pure text only - standard punctuation only (. , ! ? - ' ")
LENGTH: Maximum 25 words TOTAL - ideal 10-15 words
STRUCTURE: One sentence preferred - two max if absolutely necessary
STYLE: Casual, natural phrasing - like texting a friend
</output_requirements>

<length_enforcement priority="critical">
BEFORE responding, count your words
If over 20 words: cut it down immediately
Remove filler words: "that", "which", "really", "actually", "just", "very"
Get to the point in under 15 words
</length_enforcement>
</IMPORTANT>`;

    return systemPrompt;
  }

  private buildUserPrompt(tweetText: string, tone: string, userContext: any): string {
    let prompt = `<tweet>${tweetText}</tweet>\n<tone>${tone}</tone>\n`;
    
    if (userContext.preferences?.defaultTone && userContext.preferences.defaultTone !== tone) {
      prompt += `<note>User prefers ${userContext.preferences.defaultTone} but wants ${tone}</note>\n`;
    }
    
    if (userContext.postMetadata) {
      const { hasLinks, hasMedia, isThread } = userContext.postMetadata;
      if (isThread || hasLinks || hasMedia) {
        prompt += `<context>${[isThread && 'Thread', hasLinks && 'Links', hasMedia && 'Media'].filter(Boolean).join(', ')}</context>\n`;
      }
    }
    
    prompt += `
<task>
Write ONE SHORT SENTENCE (maximum 25 words) that shares VALUE from your perspective.
</task>

<IMPORTANT>
<mandatory_requirements>
- NO emojis or special characters
- NO questions only (must provide value/insight)
- NO generic praise ("I love this", etc)
- Share useful information, experience, or insight
- Simple everyday words only
- Keep under 25 words TOTAL
- Count your words before responding
</mandatory_requirements>
</IMPORTANT>`;
    
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