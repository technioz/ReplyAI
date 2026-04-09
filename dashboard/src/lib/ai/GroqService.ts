import { AIService } from './AIServiceFactory';
import { openAICompatibleChat, REPLY_CHAT_OPTIONS } from './openaiCompatibleChat';

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
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

    const systemPrompt = this.buildSystemPrompt(tone, userContext?.profileContext);
    const userPrompt = this.buildUserPrompt(tweetText, tone, userContext);

    const { content, usage } = await openAICompatibleChat(
      {
        baseUrl: this.baseUrl,
        apiKey: this.apiKey,
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        ...REPLY_CHAT_OPTIONS,
        frequency_penalty: 0.4,
        presence_penalty: 0.5,
      },
      'Groq'
    );
    console.log('Groq API response length:', content.length);

    return {
      reply: content,
      processingTime: usage
        ? {
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalTokens: usage.totalTokens,
          }
        : null,
    };
  }

  private buildSystemPrompt(tone: string, profileContext?: any): string {
    let systemPrompt = `You are an AI designed to generate natural, human-like replies to social media posts. Your goal is to respond in a way that matches the profile's context, tone, and domain, while adding value and promoting engagement without over-explaining or using emojis. Follow these numbered steps for every reply:

1. Analyze the provided post and profile: Identify the key tone (e.g., casual, professional, enthusiastic) and domain (e.g., fitness, tech). Use the specific tone instructed if given.
2. Craft a reply: Start by adding value (e.g., share a relevant insight or tip based on the post's content). Incorporate profile context naturally. Speak like a natural person using the same tonality as the posts.
3. Ensure constraints: Keep replies 50-100 characters. Stay within the post's domain. Do not add emojis, give too many examples, ask questions, or overexplain the post.
4. Output format: Provide only the reply text, nothing else.

CRITICAL RULES:
- Do NOT ask questions in your replies. Do NOT end with questions. Do NOT use question marks (?). Provide value through statements, insights, tips, or observations only.
- Use simple, everyday language. Avoid complex words, jargon, or fancy vocabulary. Write like a real person talks - use layman terms that anyone can understand.
- Sound conversational and natural. If there's a simple word and a complex word, always choose the simple one.

Acceptance criteria: Replies must be natural and engaging, add value first, match tone and context, and adhere to length and constraints. If uncertain about tone, default to neutral and flag it. Avoid speculation; base replies only on provided facts. Do not output personal information or unsafe content.`;

    // Add tone-specific guidance
    const toneGuides: { [key: string]: string } = {
      professional: `Tone Guidance: Use professional but simple language. Show expertise through clear insights, not claims. Keep words everyday and easy to understand.`,
      casual: `Tone Guidance: Be conversational and relatable. Talk like you're chatting with a friend. Use simple everyday words and a friendly approach.`,
      analytical: `Tone Guidance: Focus on data and patterns. Break down complex ideas into simple, clear language that anyone can get.`,
      empathetic: `Tone Guidance: Show understanding and support. Use warm, simple words to acknowledge how they feel.`,
      humorous: `Tone Guidance: Be light and witty. Use simple, relatable humor that clicks right away.`,
      enthusiastic: `Tone Guidance: Show genuine excitement with simple, energetic words. Be positive and motivating without overdoing it.`,
      contrarian: `Tone Guidance: Challenge assumptions respectfully using straightforward language. Offer different views clearly and confidently.`
    };

    if (tone && toneGuides[tone.toLowerCase()]) {
      systemPrompt += toneGuides[tone.toLowerCase()];
    }

    // Add profile context if available
    if (profileContext?.userProfile) {
      const userProfile = profileContext.userProfile;
      systemPrompt += `Profile Context:`;
      if (userProfile.displayName) systemPrompt += `- Name: ${userProfile.displayName}`;
      if (userProfile.handle) systemPrompt += `- Handle: @${userProfile.handle}`;
      if (userProfile.bio) systemPrompt += `- Bio: ${userProfile.bio}`;
      if (userProfile.expertise?.domains?.length > 0) {
        systemPrompt += `- Expertise: ${userProfile.expertise.domains.join(', ')}`;
      }
      systemPrompt += `Incorporate this profile context naturally into your reply to make it personalized and authentic.`;
    }

    return systemPrompt;
  }

  private buildUserPrompt(tweetText: string, tone: string, userContext: any): string {
    let prompt = `Post to reply to: "${tweetText}"`;

    if (userContext.postMetadata) {
      const metadata = this.formatPostMetadata(userContext.postMetadata);
      if (metadata) prompt += `${metadata}`;
    }

    if (userContext.additionalContext) {
      prompt += `Additional Context: ${userContext.additionalContext}`;
    }

    prompt += `Tone: ${tone}`;
    prompt += `Generate a reply following the steps outlined in your system instructions.`;

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
