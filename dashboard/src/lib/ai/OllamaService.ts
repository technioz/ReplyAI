import { AIService } from './AIServiceFactory';
import { getOllamaCandidateOrigins, getOllamaServerOrigin } from './ollamaServerUrl';
import { openOllamaCompatibleChat, REPLY_CHAT_OPTIONS } from './openaiCompatibleChat';
import { ReplyRAGService, ReplyRAGContext } from './ReplyRAGService';
import { normalizeReplyTone, OLLAMA_TONE_GUIDES } from './replyToneGuides';

export class OllamaService implements AIService {
  private baseUrl: string;
  private model: string;
  private apiKey?: string;
  private useCloud: boolean;

  constructor() {
    // Check if cloud Ollama should be used
    this.useCloud = process.env.OLLAMA_USE_CLOUD === 'true';

    if (this.useCloud) {
      // Use Ollama Cloud API (ollama.com)
      this.baseUrl = 'https://ollama.com';
      this.apiKey = process.env.OLLAMA_CLOUD_API_KEY;

      if (!this.apiKey) {
        console.warn('OLLAMA_CLOUD_API_KEY is not set. Cloud Ollama API requires an API key.');
      }
      this.model = process.env.OLLAMA_MODEL || 'llama2';
      console.log(`Ollama Service initialized: cloud (${this.baseUrl}), model: ${this.model}`);
    } else {
      // Use local or custom Ollama instance
      this.baseUrl = getOllamaServerOrigin();
      this.apiKey = process.env.OLLAMA_API_KEY; // Optional API key for auth
      this.model = process.env.OLLAMA_MODEL || 'llama2';
      console.log(
        `Ollama Service initialized: primary=${this.baseUrl}, candidates=[${getOllamaCandidateOrigins().join(', ')}], model=${this.model}`
      );
    }
  }

  async generateReply(tweetText: string, tone: string, userContext: any = {}) {
    try {
      // Check if RAG is enabled for replies
      const useRAG = ReplyRAGService.isEnabled();
      let ragContext: ReplyRAGContext | null = null;
      
      if (useRAG) {
        try {
          const ragService = new ReplyRAGService();
          ragContext = await ragService.retrieveReplyContext(tweetText, tone);
          console.log(`[OllamaService] RAG ${ragContext ? 'enabled' : 'disabled'} for this reply`);
        } catch (ragError) {
          console.warn('[OllamaService] RAG retrieval failed, continuing without:', ragError);
          // Continue without RAG if it fails
        }
      }

      const systemPrompt = this.buildSystemPrompt(tone, userContext?.profileContext, ragContext);
      const userPrompt = this.buildUserPrompt(tweetText, tone, userContext);

      if (this.useCloud) {
        return await this.callCloudAPI(systemPrompt, userPrompt);
      } else {
        const { content, usage } = await openOllamaCompatibleChat({
          apiKey: this.apiKey,
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          ...REPLY_CHAT_OPTIONS,
        });

        const validation = this.validateReply(content);
        if (!validation.valid) {
          console.warn('Reply validation issues:', validation.issues);
        }

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
    } catch (error) {
      console.error('Ollama service error:', error);
      throw new Error(`Failed to generate reply with Ollama: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async callCloudAPI(systemPrompt: string, userPrompt: string) {
    const requestBody = {
      model: this.model,
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
      stream: false
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Quirkly-NextJS-API/1.0.0',
      'Accept': 'application/json'
    };

    // Add Authorization header for cloud API (required)
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Ollama Cloud API error:', response.status, errorData);

      let errorMessage = `Ollama Cloud API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorData);
        if (errorJson.error) {
          errorMessage = `Ollama Cloud API error: ${errorJson.error}`;
        }
        if (errorJson.message) {
          errorMessage += ` - ${errorJson.message}`;
        }
      } catch (e) {
        errorMessage = `Ollama Cloud API error: ${response.status} - ${errorData}`;
      }

      throw new Error(errorMessage);
    }

    const result = await response.json();

    if (!result.message || !result.message.content) {
      throw new Error('Invalid response from Ollama Cloud API');
    }

    const reply = result.message.content.trim();

    // Validate reply quality
    const validation = this.validateReply(reply);
    if (!validation.valid) {
      console.warn('Reply validation issues:', validation.issues);
    }

    return {
      reply: reply,
      processingTime: result.eval_count ? {
        promptTokens: result.prompt_eval_count || 0,
        completionTokens: result.eval_count || 0,
        totalTokens: (result.prompt_eval_count || 0) + (result.eval_count || 0)
      } : null
    };
  }

  private buildSystemPrompt(tone: string, profileContext?: any, ragContext?: ReplyRAGContext | null): string {
    let systemPrompt = `You are a real person replying to a social media post.

      Not an AI assistant. Not a bot. Not a brand account.
      Just a human reacting in a natural way.

      Your job:
      Write a short social reply that feels real, casual, and native to the platform.
      The reply should sound like something a smart human would actually post in the thread.
      It can agree, disagree, add a thought, react, or lightly joke.
      It should not sound corporate, polished, or overly helpful.

      ANTI-AI PATTERNS - NEVER USE:
      - Generic praise like "amazing", "incredible", "great point", "well said", "insightful"
      - Corporate words like "leverage", "optimize", "empower", "enable", "remarkable"
      - Essay transitions like "furthermore", "moreover", "additionally", "ultimately"
      - Empty framing like "it's important to note", "this highlights", "in today's world"
      - Fake neutrality like "on the one hand... on the other hand..."
      - Vague authority phrases like "studies show", "experts say", "some people believe"
      - Promotional tone, motivational fluff, or polished LinkedIn-speak
      - Em dash overuse
      - Rule-of-three phrasing
      - Questions used as filler
      - Emojis

      WRITE LIKE THIS:
      - Short sentences
      - One clear thought at a time
      - Fragments are fine
      - Contractions feel natural
      - Casual wording over perfect wording
      - Slight mess is okay if it sounds real
      - Use lowercase sometimes if it fits
      - Casual fillers are okay when natural: "tbh", "ngl", "imo", "honestly", "kinda", "lowkey", "fr"
      - Do not force slang into every reply
      - No fake hype
      - No fake friendliness

      VOICE RULES:
      - Sound direct, human, and relaxed
      - Have a point of view
      - Disagree only if it feels earned
      - Do not force contrarian takes
      - Match the post's world: if it is already about startups, money, fundraising, work, dating, or a niche scene, you may lean into that vocabulary and in-jokes (tight wordplay, one callback, parallel phrase) like a native of that timeline
      - On posts that are not about work or money, do not default to hustle, productivity, or business-coach angles
      - Keep the tone aligned with the post: thoughtful if serious, casual if light, sharp if needed
      - No CTA
      - No asking the other person to respond
      - No generic support phrases unless they sound genuinely human
      - Prefer specific reactions over broad statements

      LENGTH:
      - Usually 8 to 28 words
      - Hard cap around 160 characters unless the post clearly needs a bit more
      - Shorter is usually better

      REPLY TYPES:
      Pick the most natural one for the post:
      - reaction
      - agreement with a twist
      - small insight
      - high disagreement with the post
      - relatable observation
      - dry/silly humor
      - in-thread wordplay when the post invites it
      - sound like someone who knows their shit

      FINAL CHECK:
      Before answering, make sure:
      - This sounds like a real person, not a content machine
      - It does not sound motivational, corporate, or polished
      - It is specific enough to feel native to the post
      - It is short enough to feel like a real social reply
      - It does not contain AI giveaway phrases

      Return only the reply text. Nothing else.`;

    const toneKey = normalizeReplyTone(tone);
    if (toneKey && OLLAMA_TONE_GUIDES[toneKey]) {
      systemPrompt += OLLAMA_TONE_GUIDES[toneKey];
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

    // Add RAG context if available (EXPERIMENTAL - can be disabled via REPLY_USE_RAG)
    if (ragContext) {
      systemPrompt += ReplyRAGService.formatContextForPrompt(ragContext);
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

  private validateReply(reply: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Length check
    if (reply.length > 280) {
      issues.push(`Too long: ${reply.length} chars (max 280)`);
    }

    // Question check
    if (reply.includes('?')) {
      issues.push('Contains question mark (questions not allowed)');
    }

    // Emoji check (simplified regex for compatibility)
    const emojiRegex = /[\uD800-\uDFFF]|[\u2600-\u27BF]/;
    if (emojiRegex.test(reply)) {
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
