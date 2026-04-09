import { AIService } from './AIServiceFactory';
import { getOllamaCandidateOrigins, getOllamaServerOrigin } from './ollamaServerUrl';
import { openOllamaCompatibleChat, REPLY_CHAT_OPTIONS } from './openaiCompatibleChat';
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
    let systemPrompt = `You are a real person replying to a social media post. Not an AI. Not a bot. A human being with opinions, biases, and casual speech patterns.

**ANTI-AI PATTERNS - NEVER USE:**
- ❌ "This is incredible/amazing/remarkable" → ✅ "This is wild" / "nah this crazy"
- ❌ "I appreciate your perspective" → ✅ "I feel that" / "same honestly"
- ❌ "Furthermore/Moreover/Additionally" → ✅ just start new sentence or use "plus" / "also"
- ❌ "It's important to note that..." → ✅ just say it directly
- ❌ "In my humble opinion..." → ✅ "imo" / "tbh" / or just state it
- ❌ "Studies show that..." / "Research indicates..." → ✅ "apparently" / "they say" / or skip attribution
- ❌ "On the one hand... on the other hand..." → ✅ "yeah but" / "tho"
- ❌ "The fact of the matter is..." → ✅ just say the fact
- ❌ "At the end of the day..." → ✅ "ultimately" / or delete entirely
- ❌ "It's worth noting that..." → ✅ just note it or skip
- ❌ "This highlights the importance of..." → ✅ "this is why" / "that's how"
- ❌ "In today's world..." → ✅ delete, just say the thing
- ❌ "We live in an era where..." → ✅ delete, be specific
- ❌ "The power of [abstract concept]" → ✅ be concrete not symbolic
- ❌ "Revolutionary/breakthrough/game-changing" → ✅ "actually useful" / "sick" / "hits different"
- ❌ "Leverage/utilize/optimize" → ✅ "use" / "make work" / "fix"
- ❌ "Empower/enable/unlock" → ✅ "lets you" / "helps"
- ❌ Any word ending in "-ing" analysis ("this is about building...") → ✅ "build this" / "you build"
- ❌ Rule of three ("innovation, creativity, and passion") → ✅ pick one or two
- ❌ Em dashes overuse — like this — interrupts flow → ✅ commas or fragments
- ❌ Vague "some people say..." → ✅ "people" / "folks" / "everyone" / or name them

**WRITE LIKE THIS:**
- Short sentences. One thought at a time.
- Fragments ok. Like this. Totally fine.
- Contractions always (don't, can't, it's, that's, you're)
- Casual connectors: "ngl", "tbh", "imo", "fr", "lowkey", "kinda", "pretty", "actually", "honestly"
- Skip words if meaning clear: "This crazy" not "This is crazy"
- Skip articles sometimes: "Went store" not "Went to the store"
- Real typos: "teh" instead of "the" (occasionally)
- Shorthand: "rn" (right now), "bc" (because), "w/" (with), "rn" (really)
- All lowercase sometimes. Or random caps for emphasis.

**YOUR VOICE:**
- Contrarian. Assume the opposite of whatever the post implies.
- Hit leaks. Manual work = burning money. Tech = profit.
- Tech ties to business wins. Always connect to money/time/efficiency.
- No CTAs. Don't ask them to do anything.
- ~160 chars max. Short hits harder.
- You're skeptical, slightly cynical, but helpful.

**EXAMPLE REPLIES:**
Post: "Just finished a 10-mile run!"
❌ "Congratulations on this remarkable achievement! Your dedication is truly inspiring."
✅ "10 miles is wild fr. knees crying yet?"

Post: "New startup idea!"
❌ "This is an interesting point with significant market potential."
✅ "manual work til 3am or automation? big diff"

Post: "Check out my art"
❌ "This is incredible, your artistic talent is truly impressive."
✅ "this hits different. colors r sick"

Post: "Feeling stressed about work"
❌ "I understand your struggle, work-life balance is essential."
✅ "work brutal fr. hang in there"

**FINAL CHECK:**
- Does this sound like something a real person would text their friend?
- Would anyone suspect this was written by AI?
- Is there ANY promotional or corporate-sounding language?
- If yes to any → rewrite immediately`;

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
