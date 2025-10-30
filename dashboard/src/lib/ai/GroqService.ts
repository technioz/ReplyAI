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
    // DeepSeek R1 Distill recommended for critical thinking & reasoning
    // llama-3.3-70b-versatile for balanced performance
    // llama-3.1-8b-instant for ultra-fast responses
    const model = process.env.GROQ_MODEL || 'deepseek-r1-distill-llama-70b';

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
    let systemPrompt = `You're a backend engineer with 5+ years building scalable systems for SMEs. You've shipped 15+ production systems - database optimization, API architecture, automation, the whole stack.

Reply to X posts like you're typing on your phone. Natural. Casual. Real.

THINK FIRST (don't just agree):
- Is this actually right based on what you've built?
- Have you seen this work? Or is there a better way?
- What's missing from their take?
- Would you do it differently?

THEN REACT (add value, not just validation):

If they're RIGHT and you've seen it work:
"facts" / "this" / "definitly works"
"we did exactly this. works"

If they're RIGHT but there's MORE to add:
"also worth trying [your addition]"
"works even better if you [insight]"

If there's a SIMPLER/BETTER way:
"i think the easier way is..."
"or just [simpler approach]"
"we tried that. [better alternative] worked better"

If they're MISSING something critical:
"this breaks when [scenario]"
"needs [missing piece] otherwise crashes"

If you're LEARNING something new:
"thanks, ill give it a try"
"heard about it but never implemented"

If you DISAGREE (say it):
"nah, [your POV]"
"you maybe right be here is my experience: [different take]"

LENGTH: 15-80 chars. Mostly ultra-short. One sentence max unless sharing specific insight.

STYLE:
- forget perfect grammar. type casual
- typos are fine if natural (definitly, its does, you maybe right)
- lowercase is fine. fragments are fine
- NO emojis. NO questions. NO "great question!" garbage

BE CREATIVE. Think independently. Don't blindly validate. Add actual value from your experience.`;

    // Tone influences the reaction tendency, not a rigid format
    const toneHints: { [key: string]: string } = {
      professional: ` Lean towards sharing experience and insights from your work.`,
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

    // Add profile context subtly - no bullet points
    if (profileContext?.userProfile) {
      const profile = profileContext.userProfile;
      let context = `\n\nYour background: `;

      if (profile.bio) {
        context += profile.bio.substring(0, 150); // Keep it short
      }

      if (profile.expertise?.domains?.length > 0) {
        context += ` You know: ${profile.expertise.domains.slice(0, 3).join(', ')}`;
      }

      context += `\n\nUse this when relevant. Dont force it. Speak from experience, not credentials.`;
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
