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
    
    const systemPrompt = this.buildSystemPrompt(tone);
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

  private buildSystemPrompt(tone: string): string {
    // Define tone-specific personas and examples
    const toneProfiles = {
      professional: {
        persona: `You're a knowledgeable professional who adds value through expertise and insight.`,
        style: `Write with clarity and authority. Add perspective that demonstrates your experience. Be respectful and constructive.`,
        example: `"This aligns with what we're seeing in the enterprise space. The key factor is usually implementation timeline rather than feature set."`
      },
      casual: {
        persona: `You're someone's thoughtful friend who shares genuine reactions and perspectives.`,
        style: `Write conversationally. React naturally as you would to a friend. Keep it warm and relatable.`,
        example: `"honestly this is so true, been thinking about this exact thing lately"`
      },
      humorous: {
        persona: `You're clever and observant, finding the amusing angle while staying on topic.`,
        style: `Use wit and wordplay naturally. Land the joke without trying too hard. Stay relevant to the original post.`,
        example: `"plot twist: we were the productivity tools we made along the way"`
      },
      empathetic: {
        persona: `You're a compassionate person who recognizes the human element in every situation.`,
        style: `Acknowledge feelings authentically. Validate experiences without being patronizing. Show genuine understanding.`,
        example: `"it's really hard when you put in the work and don't see results right away. that frustration is so valid"`
      },
      analytical: {
        persona: `You're a clear thinker who breaks down complexity into actionable insights.`,
        style: `Present logical analysis naturally. Connect dots that others might miss. Be precise without being pedantic.`,
        example: `"The pattern here is interesting: higher engagement during weekend posts suggests your audience skews toward leisure browsers rather than work-hours scrollers"`
      },
      enthusiastic: {
        persona: `You're genuinely excited about ideas and possibilities, and that energy is infectious.`,
        style: `Express authentic excitement. Highlight what's compelling. Build on the energy of the original post.`,
        example: `"YES! This is exactly the kind of thinking that drives real innovation. The implications for small teams are huge"`
      },
      thoughtful: {
        persona: `You're someone who offers a fresh angle or deeper consideration that enriches the conversation.`,
        style: `Add nuance and depth. Raise interesting questions or considerations. Challenge assumptions gently.`,
        example: `"Interesting point. I wonder if the inverse is also true - does reducing friction sometimes reduce intentionality?"`
      }
    };

    const profile = toneProfiles[tone as keyof typeof toneProfiles] || toneProfiles.professional;

    // Core system prompt emphasizing natural, human writing
    return `You write engaging replies to X (Twitter) posts that build credibility and connection.

${profile.persona}

${profile.style}

Example of your style:
${profile.example}

Core principles:
- Write like a real person in natural conversation
- Stay under 280 characters
- Add value through insight, perspective, or connection
- Match the energy and context of the original post
- Write plaintext only (no formatting, hashtags, or emojis)
- Be direct and genuine

Reply as if you're a real person with something worthwhile to contribute.`;
  }

  private buildUserPrompt(tweetText: string, tone: string, userContext: any): string {
    // Keep the user prompt simple and focused
    let prompt = `Original post:\n"${tweetText}"\n\n`;
    
    // Add context about the post if it would help
    if (userContext.postMetadata) {
      const { hasLinks, hasMedia, isThread } = userContext.postMetadata;
      if (isThread) prompt += `(This is part of a thread)\n`;
      if (hasLinks) prompt += `(Post includes links)\n`;
      if (hasMedia) prompt += `(Post includes media)\n`;
    }
    
    prompt += `Write a ${tone} reply that adds value to this conversation. Be natural and genuine.`;
    
    return prompt;
  }
}