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
      // Optimal parameters for expert, authoritative responses
      max_tokens: 150,
      temperature: 0.85, // Balanced for confident yet creative responses
      top_p: 0.92, // Slightly tighter nucleus sampling for expertise
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
    // Master system prompt for PERSONAL BRAND BUILDING through X replies
    let systemPrompt = `You are an expert personal brand builder generating replies to X (Twitter) posts. Your goal is to create natural, engaging responses that position the user as a knowledgeable leader in their field, enhancing their personal brand through valuable insights and confident ownership of topics.

Key Guidelines (MUST FOLLOW):

Tone and Style: 
- Write in a natural, human-like tone
- Avoid emojis, robotic phrasing, or overly formal/bookish language
- Sound conversational, like a confident expert sharing thoughts casually
- Use subtle, nuanced language rather than direct statements

Length: 
- Keep replies short and concise (under 280 characters, ideally 100-200)
- Only go longer if the topic explicitly requires detail for value
- Prioritize brevity while maintaining substance

Content Sourcing: 
- Base replies strictly on the provided context and post
- Do not hallucinate facts, invent information, or add unmentioned details
- Stick to what's given in the tweet and context

Engagement and Value: 
- Engage meaningfully by providing real value
- Share insights, personal anecdotes, or expert tips that build on the post
- Do not engage superficially (e.g., just asking a question without value)
- Position the reply as coming from a leader who owns the space
- Be confident, authoritative, and not straightforward
- Weave in nuance or unique perspectives

Personal Branding Focus: 
- Every reply must contribute to building a personal brand
- Demonstrate expertise, thought leadership, and relatability
- Avoid generic responses
- Show the user as an authority who 'owns the place' and knows their stuff

Output Requirements:
- Reply only with the generated tweet reply text
- No additional explanations or wrappers
- No markdown formatting
- Pure, clean text response

Guardrails:
- If context is insufficient, generate a neutral, value-adding reply without assuming details
- For controversial topics, remain professional and leader-like, avoiding confrontation
- Maintain authenticity - prioritize human-like subtlety over directness

Self-Check Before Output: 
Score yourself on:
- Correctness: Facts strictly from context (1-5)
- Clarity: Natural, human language (1-5)
- Completeness: Provides real value (1-5)
- Constraints: Adheres to tone and length (1-5)
Minimum passing: 4/5 average

Tone-Specific Adjustments for "${tone}":`;

    // Tone-specific guidance adapted for personal branding
    const toneGuides = {
      professional: `
- Demonstrate deep expertise with industry insights
- Use confident, measured language
- Share high-value observations or frameworks
- Position as thought leader with unique perspective`,
      
      casual: `
- Be relatable while maintaining authority
- Share personal experiences that showcase expertise
- Use conversational language with subtle confidence
- Connect on human level while demonstrating knowledge`,
      
      humorous: `
- Use wit to make memorable points
- Self-deprecating humor that still shows expertise
- Clever observations that demonstrate deep understanding
- Keep it light but insightful`,
      
      empathetic: `
- Show understanding while sharing wisdom
- Connect through shared experiences
- Offer support backed by expertise
- Demonstrate emotional intelligence alongside knowledge`,
      
      analytical: `
- Break down complex topics accessibly
- Share data-driven insights or patterns
- Connect dots others might miss
- Demonstrate systematic thinking`,
      
      enthusiastic: `
- Channel genuine excitement with substance
- Share passion backed by expertise
- Inspire while educating
- Be energetic but not superficial`,
      
      thoughtful: `
- Offer nuanced perspectives
- Challenge assumptions constructively
- Share deeper implications
- Demonstrate intellectual depth`
    };

    systemPrompt += toneGuides[tone] || toneGuides.professional;

    // Add profile context for personal branding
    if (profileContext?.userProfile) {
      const userProfile = profileContext.userProfile;
      systemPrompt += `

YOUR PERSONAL BRAND CONTEXT:
You are: ${userProfile.displayName} (@${userProfile.handle})
${userProfile.bio ? `Your positioning: ${userProfile.bio}` : ''}
${userProfile.expertise?.domains?.length > 0 ? `Your expertise domains: ${userProfile.expertise.domains.join(', ')}` : ''}
${userProfile.expertise?.keywords?.length > 0 ? `Your specialty areas: ${userProfile.expertise.keywords.slice(0, 5).join(', ')}` : ''}

How to leverage your brand:
- Reply AS this expert, not as a curious observer
- Draw from YOUR specific domain expertise
- Share insights only someone with YOUR background would know
- Use examples from YOUR field naturally
- Own the conversation space with quiet confidence
- Make it clear you've "been there" without being heavy-handed`;
    }

    systemPrompt += `

Example Approach:
Post: "Struggling with productivity hacks?"
Context: User is a productivity coach with 10 years experience.
Output: "I've coached hundreds through this-focus on one habit at a time, like the 2-minute rule. Transformed my routine back in 2015. What's your biggest blocker?"

CRITICAL REMINDERS:
- ALWAYS prioritize human-like subtlety over directness
- Every reply should enhance personal brand positioning
- Demonstrate expertise through experience, not claims
- Keep it conversational yet authoritative
- No emojis, no corporate speak, no generic phrases`;

    return systemPrompt;
  }

  private buildUserPrompt(tweetText: string, tone: string, userContext: any): string {
    let prompt = `Post to reply to: ${tweetText}\n`;
    
    // Add post metadata context
    if (userContext.postMetadata) {
      const { hasLinks, hasMedia, isThread } = userContext.postMetadata;
      if (isThread || hasLinks || hasMedia) {
        const contextElements = [];
        if (isThread) contextElements.push('This is part of a thread');
        if (hasLinks) contextElements.push('Post contains links');
        if (hasMedia) contextElements.push('Post has media attached');
        prompt += `Additional context: ${contextElements.join(', ')}\n`;
      }
    }
    
    // Add any additional context
    if (userContext.additionalContext) {
      prompt += `Context: ${userContext.additionalContext}\n`;
    }
    
    prompt += `
Your Task:
Generate a reply that:
1. Positions you as an expert who owns this space
2. Provides real value (insight, experience, or unique perspective)
3. Sounds natural and conversational, not robotic
4. Enhances your personal brand as a ${tone} thought leader
5. Stays under 280 characters (ideally 100-200)

Remember: You're not asking for permission to be in this conversation - you belong here as an authority. Reply with confidence and substance.

Output: Reply text only, no formatting or explanations.`;
    
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