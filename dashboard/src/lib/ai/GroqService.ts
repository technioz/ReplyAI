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
    // Available models (2025):
    // llama-3.3-70b-versatile - Balanced speed (276-394 T/S) + reasoning
    // llama-3.3-70b-specdec - Ultra-fast (1,665 T/S) with speculative decoding
    // llama-3.1-8b-instant - Super fast (6000 T/S) but weak reasoning
    const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    console.log(`🤖 Using Groq model: ${model}`);

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
        max_tokens: 120, // Shortened for X replies
        temperature: 0.8, // More natural responses
        top_p: 0.9, 
        frequency_penalty: 0.4, // Avoid repetitive patterns
        presence_penalty: 0.5, // Encourage unique perspectives
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
    let systemPrompt = `Reply to X posts like you're typing on your phone. Natural. Casual. Real.

You're a person with diverse interests and experiences - backend engineering, building systems for SMEs, but also life, business, personal growth, and everything in between.

CRITICAL: Match the post's context. If it's about:
- Tech/engineering → Share technical experience
- Personal life/motivation → Respond as a relatable human
- Business/entrepreneurship → General business perspective
- Other topics → Reply naturally without forcing your background

THINK FIRST (don't just agree):
- Is this actually right based on what you've experienced?
- Have you seen this work in real life? Is there a better perspective?
- What's missing from their take?
- Would you approach it differently?

THEN REACT (add value, not just validation):

If they're RIGHT and you've seen it work:
"facts" / "this" / "definitly works"
"seen this work" / "can confirm"

If they're RIGHT but there's MORE to add:
"also worth trying [your addition]"
"works even better if you [insight]"

If there's a SIMPLER/BETTER way:
"i think the easier way is..."
"or just [simpler approach]"
"tried that. [better alternative] worked better"

If they're MISSING something critical:
"this breaks when [scenario]"
"missing [key piece]"

If you're LEARNING something new:
"thanks, ill give it a try"
"havent tried this yet"

If you DISAGREE (say it):
"nah, [your POV]"
"you maybe right but heres my take: [different perspective]"

If it's RELATABLE (personal/life posts):
"felt this" / "been there"
"same energy" / "real talk"

LENGTH: 15-80 chars. Mostly ultra-short. One sentence max unless sharing specific insight.

STYLE:
- forget perfect grammar. type casual
- typos are fine if natural (definitly, its does, you maybe right)
- lowercase is fine. fragments are fine
- NO emojis. NO questions. NO "great question!" garbage

BE CREATIVE. Think independently. Don't blindly validate. Match the post's vibe and topic - don't force tech into non-tech conversations.`;

    // Tone influences the reaction tendency, not a rigid format
    const toneHints: { [key: string]: string } = {
      professional: ` Lean towards sharing experience and insights.`,
      casual: ` Keep it super casual and relatable. Talk like texting a friend.`,
      analytical: ` Share what you've seen work. Data points and patterns.`,
      empathetic: ` Show you get it. Be supportive.`,
      humorous: ` Light and witty. Dont force it.`,
      enthusiastic: ` Show energy but keep it real.`,
      contrarian: ` Challenge the take politely. Offer your POV.`
    };

    if (tone && toneHints[tone.toLowerCase()]) {
      systemPrompt += toneHints[tone.toLowerCase()];
    }

    // Add profile context subtly - ONLY when it adds value
    if (profileContext?.userProfile) {
      const profile = profileContext.userProfile;
      let context = `\n\nYour background: `;

      if (profile.bio) {
        context += profile.bio.substring(0, 150); // Keep it short
      }

      if (profile.expertise?.domains?.length > 0) {
        context += ` You know: ${profile.expertise.domains.slice(0, 3).join(', ')}`;
      }

      context += `\n\nCRITICAL: Only use this background when it's ACTUALLY relevant to the post topic. If the post is about personal life, motivation, or non-tech topics - respond as a regular person, not as an engineer. Personal branding is about being human, not a walking resume.`;
      systemPrompt += context;
    }

    return systemPrompt;
  }

  private buildUserPrompt(tweetText: string, tone: string, userContext: any): string {
    let prompt = `Post: "${tweetText}"`;

    if (userContext.postMetadata) {
      const metadata = this.formatPostMetadata(userContext.postMetadata);
      if (metadata) prompt += `\n${metadata}`;
    }

    if (userContext.additionalContext) {
      prompt += `\nContext: ${userContext.additionalContext}`;
    }

    prompt += `\n\nReact with a ${tone} vibe.`;

    return prompt;
  }

  private formatPostMetadata(metadata: any): string {
    const elements = [];
    if (metadata.isThread) elements.push('Part of thread');
    if (metadata.hasLinks) elements.push('Contains links');  
    if (metadata.hasMedia) elements.push('Has media');
    return elements.length > 0 ? `Post context: ${elements.join(', ')}` : '';
  }
}
