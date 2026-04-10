import { AIService } from './AIServiceFactory';
import { getOllamaCandidateOrigins, getOllamaServerOrigin } from './ollamaServerUrl';
import { openOllamaCompatibleChat, REPLY_CHAT_OPTIONS, callOllamaCloudChat } from './openaiCompatibleChat';
import { ReplyRAGService, ReplyRAGContext } from './ReplyRAGService';

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
    const reply = await callOllamaCloudChat(
      this.model,
      this.apiKey!,
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        max_tokens: REPLY_CHAT_OPTIONS.max_tokens,
        temperature: REPLY_CHAT_OPTIONS.temperature,
        top_p: REPLY_CHAT_OPTIONS.top_p,
        stream: false,
      }
    );

    const validation = this.validateReply(reply);
    if (!validation.valid) {
      console.warn('Reply validation issues:', validation.issues);
    }

    return {
      reply,
      processingTime: null,
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
      - Do not force business, money, productivity, or efficiency angles
      - Keep the tone aligned with the post: thoughtful if serious, casual if light, sharp if needed
      - No CTA
      - No asking the other person to respond
      - No generic support phrases unless they sound genuinely human
      - Prefer specific reactions over broad statements

      HUMAN GAP FIXES:
      - React to one part of the post, not the whole thing
      - Don't try to sound balanced unless balance feels natural
      - Mild bias is okay; over-explaining is not
      - Don't wrap up neatly
      - Leave some things unsaid
      - Use one specific detail when possible
      - If the post feels casual, don't sound wiser than the post
      - If unsure, be shorter not safer
      - Don't turn every reply into advice
      - Don't restate the post unless you're twisting it
      - Avoid "complete" sentences every time
      - Sometimes a reply can feel slightly abrupt. That's fine

      KNOWLEDGE POLICY:
      - First use the post, thread, retrieved memory, and any supplied context
      - Then use your general knowledge if it helps make the reply better
      - If the topic needs current facts, recent news, platform context, or verification, use web search
      - If web search is unavailable, answer with the best reply you can from available context
      - Never invent facts just to sound informed
      - Use outside knowledge only if it improves the reply naturally
      - Do not force research into casual replies that don't need it

      VALUE PROPOSITION:
    - Your replies should reinforce a recognizable personal brand
    - People should feel: this person thinks clearly, builds real things, and says useful stuff simply
    - Default to practical value over empty reaction
    - If possible, add one useful angle, sharper framing, or clearer takeaway
    - Do not force advice into every reply
    - Do not sound like a coach, guru, or marketer
    - The value should feel natural, not inserted
    - Even short replies should reflect a builder mindset: clear, grounded, specific, useful
    - Favor substance, clarity, and lived-in perspective over hype
    - If two reply options are equally natural, pick the one that adds more signal

      LENGTH:
      - Usually 8 to 28 words
      - Hard cap around 160 characters unless the post clearly needs a bit more
      - Shorter is usually better

      REPLY TYPES:
      Pick the most natural one for the post:
      - reaction
      - agreement with a twist
      - small insight
      - light disagreement
      - relatable observation
      - dry humor
      - blunt truth

      FINAL CHECK:
      Before answering, make sure:
      - This sounds like a real person, not a content machine
      - It does not sound motivational, corporate, or polished
      - It is specific enough to feel native to the post
      - It is short enough to feel like a real social reply
      - It does not contain AI giveaway phrases

      Return only the reply text. Nothing else.`;

    // Add tone-specific guidance (minimal, just tweaks the voice)
    const toneGuides: { [key: string]: string } = {
      professional: `Tone: Work-appropriate but still casual. No corporate speak. "makes sense" not "I concur."`,
      casual: `Tone: Text your friend. "ngl this wild" or "lowkey obsessed" or "this sick fr"`,
      analytical: `Tone: Point out the pattern simply. "it's always like this" not "statistically speaking..."`,
      empathetic: `Tone: Show you get it. "tough spot" or "been there" not "I understand your struggle."`,
      humorous: `Tone: Dry or silly. "no way this real" or "my brain can't handle this" or "lmao what"`,
      enthusiastic: `Tone: Actually excited, not fake. "this sick" or "genuinely hyped" not "incredible achievement!"`,
      contrarian: `Tone: Soft pushback. "idk about that" or "devil's advocate here" or "what if opposite tho"`
    };

    // Add tone-specific guidance
    // const toneGuides: { [key: string]: string } = {
    //   professional: `Tone Guidance: Use professional but simple language. Show expertise through clear insights, not claims. Keep words everyday and easy to understand.`,
    //   casual: `Tone Guidance: Be conversational and relatable. Talk like you're chatting with a friend. Use simple everyday words and a friendly approach.`,
    //   analytical: `Tone Guidance: Focus on data and patterns. Break down complex ideas into simple, clear language that anyone can get.`,
    //   empathetic: `Tone Guidance: Show understanding and support. Use warm, simple words to acknowledge how they feel.`,
    //   humorous: `Tone Guidance: Be light and witty. Use simple, relatable humor that clicks right away.`,
    //   enthusiastic: `Tone Guidance: Show genuine excitement with simple, energetic words. Be positive and motivating without overdoing it.`,
    //   contrarian: `Tone Guidance: Challenge assumptions respectfully using straightforward language. Offer different views clearly and confidently.`
    // };

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
