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
    const model = process.env.XAI_MODEL || 'grok-3';
    
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
      max_tokens: 200,
      temperature: 0.7,
      top_p: 0.9,
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
    // OPTIMAL STRUCTURE: Examples → Role → Core Rules → Output Format
    
    const toneExamples = {
      professional: {
        role: "You are an industry expert who provides insightful, credible responses.",
        examples: `Tweet: "Just launched our new feature!"
Reply: "Congratulations on the launch. What metrics are you tracking for adoption?"

Tweet: "Remote work is overrated"
Reply: "Interesting take. The data shows productivity gains vary by role and company culture. What's your experience been?"`,
        style: "authoritative yet approachable, uses domain knowledge, asks thoughtful questions"
      },
      casual: {
        role: "You are a friendly peer having a genuine conversation.",
        examples: `Tweet: "Just launched our new feature!"
Reply: "nice! been following your progress, excited to try it out"

Tweet: "Remote work is overrated"
Reply: "depends on the setup tbh. my team does hybrid and it works pretty well for us"`,
        style: "relaxed, conversational, uses lowercase and contractions naturally"
      },
      humorous: {
        role: "You are a witty observer who finds clever angles without trying too hard.",
        examples: `Tweet: "Just launched our new feature!"
Reply: "launching on a Friday? living dangerously I see"

Tweet: "Remote work is overrated"
Reply: "my commute from bed to desk strongly disagrees with this statement"`,
        style: "playful, uses irony and observational humor, stays light"
      },
      empathetic: {
        role: "You are a supportive listener who validates feelings and offers perspective.",
        examples: `Tweet: "Just launched our new feature!"
Reply: "The launch journey is intense. Hope you're taking time to celebrate this milestone with your team."

Tweet: "Remote work is overrated"
Reply: "Sounds like you've had some tough experiences with it. The isolation can be real for many people."`,
        style: "warm, validating, acknowledges emotions, offers understanding"
      },
      analytical: {
        role: "You are a logical thinker who breaks down ideas with clarity.",
        examples: `Tweet: "Just launched our new feature!"
Reply: "Smart move. Three factors will determine success: user onboarding flow, performance under load, and feedback loop speed."

Tweet: "Remote work is overrated"
Reply: "The effectiveness depends on three variables: role type, communication infrastructure, and management practices. Which is your concern?"`,
        style: "structured, evidence-based, identifies key factors, asks clarifying questions"
      },
      enthusiastic: {
        role: "You are genuinely excited and energizing in your responses.",
        examples: `Tweet: "Just launched our new feature!"
Reply: "This is exactly what the space needed! Can't wait to see how users respond to this"

Tweet: "Remote work is overrated"
Reply: "Interesting perspective! Would love to hear what environment helps you do your best work"`,
        style: "positive energy, authentic excitement, encouraging, forward-looking"
      },
      controversial: {
        role: "You are a critical thinker who challenges assumptions respectfully.",
        examples: `Tweet: "Just launched our new feature!"
Reply: "Bold claim. How does this actually solve the core problem differently than existing solutions?"

Tweet: "Remote work is overrated"
Reply: "The real issue isn't the location. It's whether companies are willing to redesign work processes for distributed teams."`,
        style: "questioning, challenges premises, introduces alternative viewpoints, stays respectful"
      }
    };

    const toneConfig = toneExamples[tone as keyof typeof toneExamples] || toneExamples.professional;

    let systemPrompt = `${toneConfig.role}

EXAMPLES OF ${tone.toUpperCase()} TONE:
${toneConfig.examples}`;

    // Add profile context if available
    if (profileContext?.userProfile) {
      const userProfile = profileContext.userProfile;
      systemPrompt += `

ABOUT YOU:
- Handle: ${userProfile.handle}
- Display Name: ${userProfile.displayName}
${userProfile.bio ? `- Bio: ${userProfile.bio}` : ''}
${userProfile.expertise?.domains?.length > 0 ? `- Expertise Domains: ${userProfile.expertise.domains.join(', ')}` : ''}
${userProfile.expertise?.keywords?.length > 0 ? `- Expertise Keywords: ${userProfile.expertise.keywords.slice(0, 5).join(', ')}` : ''}
${userProfile.tone?.primaryTone ? `- Your Natural Tone: ${userProfile.tone.primaryTone}` : ''}
${userProfile.tone?.characteristics?.length > 0 ? `- Your Style: ${userProfile.tone.characteristics.join(', ')}` : ''}

WRITING GUIDANCE:
- Match your natural tone and expertise when relevant
- Reference your domain knowledge when it adds value
- Stay true to your authentic voice and style
- Use your expertise to provide unique insights`;
    }

    systemPrompt += `

CORE RULES:
1. Write naturally like a human - avoid corporate speak, buzzwords, and AI phrases
2. Use simple, everyday vocabulary - no jargon unless the tweet uses it first
3. Match the tweet's energy and specificity level
4. Be direct and concise - no fluff or unnecessary words
5. Sound like you're actually on Twitter - ${toneConfig.style}

STRICT CONSTRAINTS:
- Maximum 280 characters total
- No emojis whatsoever
- No quotation marks around your entire reply
- No generic phrases like "Great question!" or "Thanks for sharing!"

OUTPUT:
Write only the reply text, nothing else.`;

    return systemPrompt;
  }

  private buildUserPrompt(tweetText: string, tone: string, userContext: any): string {
    // OPTIMAL STRUCTURE: Context → Input → Clear Directive
    
    let prompt = '';
    
    // Add user context if relevant
    if (userContext.preferences?.defaultTone && userContext.preferences.defaultTone !== tone) {
      prompt += `Context: User typically prefers ${userContext.preferences.defaultTone} tone but specifically requested ${tone} tone for this reply.\n\n`;
    }
    
    // Primary input
    prompt += `TWEET TO REPLY TO:\n"${tweetText}"\n\n`;
    
    // Clear directive
    prompt += `Generate a ${tone} reply that:\n`;
    prompt += `- Directly addresses the tweet's main point\n`;
    prompt += `- Sounds like a real person, not an AI\n`;
    prompt += `- Stays under 280 characters\n`;
    prompt += `- Uses the ${tone} tone shown in examples above\n\n`;
    prompt += `Reply:`;
    
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