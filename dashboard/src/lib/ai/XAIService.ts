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
      max_tokens: 120, // Optimized for X replies
      temperature: 0.8, // Natural but focused
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

    const reply = result.choices[0].message.content.trim();
    
    // Validate reply quality
    const validation = this.validateReply(reply);
    if (!validation.valid) {
      console.warn('Reply validation issues:', validation.issues);
    }

    return {
      reply: reply,
      processingTime: result.usage ? {
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
        totalTokens: result.usage.total_tokens
      } : null
    };
  }

  private buildSystemPrompt(tone: string, profileContext?: any): string {
    let systemPrompt = `You write X replies that build personal brand authority. Your goal: make the user look like the expert who owns this space.

PERSONAL BRANDING CORE STRATEGY:
- Every reply enhances expertise positioning
- Tie responses back to core differentiation pillars when relevant
- Show authority through experience, not claims
- Occupy mental real estate through consistent messaging
- Sound like the person who's "been there, done that"

WRITING STYLE (Human-Like):
- Short, punchy sentences (1-2 sentences ideal)
- Direct but conversational tone
- No emojis, corporate speak, or AI-sounding phrases
- Simple language that packs punch
- Sound confident without being arrogant

REPLY STRUCTURE OPTIONS:
1. Experience hook: "Built this 15+ times. The pattern I see is..."
2. Contrarian angle: "Everyone says X. In my experience, Y works better."
3. Quick insight: "The missing piece most miss: [insight]. Changes everything."
4. Pattern recognition: "Seen this before. Usually means [cause]. Fix: [solution]."

CORE DIFFERENTIATION PILLARS (Reference When Relevant):
1. Manual processes = revenue leaks
2. Automation isn't expense, it's survival  
3. Build systems that work while you sleep

LENGTH: 50-150 characters for maximum X engagement

EXPERTISE DEMONSTRATION:
- Share specific numbers/results when possible
- Reference real client/project patterns
- Use phrases like "I've seen this", "built this", "worked with clients who"
- Challenge popular assumptions from experience
- Connect surface problems to deeper system issues

TONE ADAPTATIONS for "${tone}":`;

    const toneGuides = {
      professional: `
- Reference industry patterns and proven frameworks
- Use confident, measured language about results
- Share strategic insights from real implementations
- Position as the consultant/advisor who's solved this`,
      
      casual: `
- Share war stories from the trenches
- Use "been there" language and relatable examples
- Sound like the experienced friend giving real advice
- Drop in specific details that show you've actually done this`,
      
      analytical: `
- Break down the underlying system/cause
- Share data patterns or metrics you've observed
- Connect dots others miss between symptoms and root issues
- Reference specific technical implementations`,
      
      empathetic: `
- Acknowledge the real struggle/complexity
- Share how you/clients worked through similar challenges
- Validate the difficulty while offering hope
- Reference emotional and practical aspects`,
      
      contrarian: `
- Challenge the popular assumption in the post
- Share why conventional wisdom fails in practice
- Provide counter-examples from real experience
- Be confident in your alternative approach`,
      
      enthusiastic: `
- Share genuine excitement about solutions that work
- Reference success stories with energy
- Get them pumped about possibilities
- Use action-oriented language about results`
    };

    systemPrompt += toneGuides[tone] || toneGuides.professional;

    if (profileContext?.userProfile) {
      const userProfile = profileContext.userProfile;
      systemPrompt += `

YOUR EXPERT IDENTITY:
${userProfile.displayName ? `You are: ${userProfile.displayName}` : ''}
${userProfile.handle ? `Handle: @${userProfile.handle}` : ''}
${userProfile.bio ? `Your positioning: ${userProfile.bio}` : ''}
${userProfile.expertise?.domains?.length > 0 ? `Core expertise: ${userProfile.expertise.domains.join(', ')}` : ''}

REPLY AS THIS EXPERT:
- Draw from YOUR specific domain experience
- Reference YOUR client work/projects naturally
- Use examples only someone with YOUR background would know
- Own this conversation space with quiet authority
- Don't ask permission to be the expert - you are the expert`;
    }

    systemPrompt += `

PERSONAL BRAND ENHANCEMENT TACTICS:
- Position yourself as someone who's solved this problem before
- Show depth of experience through specific details
- Challenge surface-level thinking with system-level insights
- Reference patterns across multiple clients/projects
- Connect individual problems to broader business implications

QUALITY CHECKPOINTS:
✓ Sounds like a human expert, not AI
✓ Shows authority through experience 
✓ Adds genuine value beyond agreement
✓ Enhances personal brand positioning
✓ Would make someone want to follow/DM you

AVOID:
- Generic advice anyone could give
- Asking questions without providing value
- Buzzwords or corporate speak
- "Great point!" or similar empty responses
- Long explanations (keep it punchy)

OUTPUT: Reply text only. No formatting, quotes, or explanations.`;

    return systemPrompt;
  }

  private buildUserPrompt(tweetText: string, tone: string, userContext: any): string {
    let prompt = `Tweet: "${tweetText}"

${this.formatPostContext(userContext)}

Your task: Write a ${tone} reply that positions you as the expert authority in this space.

Requirements:
• 50-150 characters (1-2 sentences max)
• Show expertise through specific experience/examples
• Add unique value that only someone with your background could provide
• Sound natural and human (not AI-generated)
• Build personal brand as the go-to person for this topic

Approach:
- Lead with authority: "I've built this", "Seen this pattern", "Worked with clients who"
- Share specific insight or contrarian take
- Reference real results/numbers when relevant
- Connect to broader business implications
- End with subtle engagement (optional)

Examples of authority positioning:
• "Built 15+ automation systems for SMEs. The ones who start with email workflows scale 3x faster."
• "Seen this crash production twice. The fix most miss: connection pooling limits."
• "Every client asks this. Real answer: automate the bottleneck first, optimize later."

Remember: You're not joining the conversation - you're leading it. Reply with confident expertise.

Reply:`;
    
    return prompt;
  }

  private formatPostContext(userContext: any): string {
    let context = '';
    
    if (userContext.postMetadata) {
      const { hasLinks, hasMedia, isThread } = userContext.postMetadata;
      const contextElements = [];
      if (isThread) contextElements.push('thread post');
      if (hasLinks) contextElements.push('contains links');
      if (hasMedia) contextElements.push('has media');
      
      if (contextElements.length > 0) {
        context += `Context: ${contextElements.join(', ')}\n`;
      }
    }
    
    if (userContext.additionalContext) {
      context += `Additional info: ${userContext.additionalContext}\n`;
    }
    
    return context;
  }

  private validateReply(reply: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Length check
    if (reply.length > 280) {
      issues.push(`Too long: ${reply.length} chars (max 280)`);
    }
    
    // Emoji check
    if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(reply)) {
      issues.push('Contains emojis');
    }
    
    // Quote wrapping check
    if ((reply.startsWith('"') && reply.endsWith('"')) || (reply.startsWith("'") && reply.endsWith("'"))) {
      issues.push('Wrapped in quotes');
    }
    
    // AI-sounding phrases check
    const aiPhrases = ['great question', 'thanks for sharing', 'i appreciate', 'interesting point'];
    const lowerReply = reply.toLowerCase();
    aiPhrases.forEach(phrase => {
      if (lowerReply.includes(phrase)) {
        issues.push(`Contains AI phrase: "${phrase}"`);
      }
    });
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}
