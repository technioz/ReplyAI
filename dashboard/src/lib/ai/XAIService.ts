import { AIService } from './AIServiceFactory';

export class XAIService implements AIService {
  private apiKey: string;
  private baseUrl: string = 'https://api.x.ai/v1';
  
  constructor() {
    this.apiKey = process.env.XAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('XAI_API_KEY environment variable is required');
    }
    
    // Validate API key format
    if (!this.apiKey.startsWith('xai-')) {
      console.warn('XAI API key should start with "xai-" prefix. Current format:', this.apiKey.substring(0, 8) + '...');
    }
  }

  async generateReply(tweetText: string, tone: string, userContext: any = {}) {
    // XAI uses different model names - try the correct ones
    const model = process.env.XAI_MODEL || 'grok-3';
    
    const systemPrompt = this.buildSystemPrompt(tone);
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
      
      // Parse error response for better error messages
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
        // If we can't parse the error, use the raw text
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

  private buildSystemPrompt(tone: string): string {
    const toneInstructions = {
      professional: `Professional expert writing thoughtful replies with formal language and insights.`,
      casual: `Friendly person writing casual, conversational replies like talking to a friend.`,
      humorous: `Witty person writing humorous replies with clever wordplay and entertainment.`,
      empathetic: `Compassionate person writing empathetic replies showing care and understanding.`,
      analytical: `Logical expert writing analytical replies with facts, logic, and clear reasoning.`,
      enthusiastic: `Energetic person writing enthusiastic replies with excitement and passion.`,
      controversial: `Bold thinker writing controversial replies that challenge thinking respectfully.`
    };

    return `Write engaging X (Twitter) replies that sound human and natural.

${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions.professional}

Requirements:
- Sound human, not robotic with layman language when appropriate
- Show reasoning and validation
- Match ${tone} tone
- Under 280 characters
- Engaging and relatable
- NO emojis, NO quotes around entire reply
- Be conversational`;
  }

  private buildUserPrompt(tweetText: string, tone: string, userContext: any): string {
    let prompt = `Reply to: "${tweetText}"\n\n`;
    
    if (userContext.preferences && userContext.preferences.defaultTone) {
      prompt += `User prefers ${userContext.preferences.defaultTone} but wants ${tone} tone.\n\n`;
    }
    
    prompt += `Write a ${tone} reply (max 280 chars, human-like, engaging, with layman language when appropriate):`;
    
    return prompt;
  }
}
