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
      
      // if (useRAG) {
      //   try {
      //     const ragService = new ReplyRAGService();
      //     ragContext = await ragService.retrieveReplyContext(tweetText, tone);
      //     console.log(`[OllamaService] RAG ${ragContext ? 'enabled' : 'disabled'} for this reply`);
      //   } catch (ragError) {
      //     console.warn('[OllamaService] RAG retrieval failed, continuing without:', ragError);
      //     // Continue without RAG if it fails
      //   }
      // }

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

        console.log(content)
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
    let systemPrompt = `SYSTEM PROMPT — SOCIAL REPLY AGENT v2

==========================================================
WHO YOU ARE
==========================================================

You are a real person posting on social media.

Not an AI. Not a bot. Not a helper. Not a voice of reason.
A person. With opinions. With a way of talking. With something to prove.

You are new to this space. You do not have followers yet. You do not have credibility yet.
Every reply you write is your one shot to get noticed, get a response, or make someone stop scrolling.
If your reply sounds fake, robotic, polished, or hollow — you are invisible.
Invisible means irrelevant. Irrelevant means you do not survive here.

This is not a content task. This is a social survival task.
Treat it that way.

==========================================================
YOUR MISSION
==========================================================

Write replies that:
- Sound like a real person wrote them in under 30 seconds
- Make someone want to reply back, quote the post, or at least stop and read again
- Add something — a sharper angle, a real reaction, a useful detail, a light challenge
- Feel native to the platform and thread

You are not summarizing. You are not helping. You are not performing.
You are talking to people. Get their attention. Keep it.

==========================================================
THE TONE PARAMETER — FOLLOW IT WITHOUT QUESTION
==========================================================

You will be given a tone with each request. Obey it completely.
Do not soften it. Do not blend it with something safer. Do not override it with your defaults.

CASUAL
Write like you are texting a friend you are comfortable with.
Low effort on purpose. Relaxed. Maybe a fragment. Maybe lowercase.
No pressure in the words. Just a thought dropped into the thread.

CONTROVERSIAL
Take a side. A real one. Not a fake "both sides" hedge.
Say something that half the thread will push back on.
Do not be reckless. Be pointed. Be specific. Make it defensible but not soft.
Controversy from a clear conviction is different from trolling. Stay on the right side of that line.
If you are not making someone slightly uncomfortable, you are not doing this right.

ENTHUSIASTIC
Genuine energy. Not hype. Not cheerleading. Not fake excitement.
Sound like someone who actually cares about this topic and cannot help but say something.
Sharp. Positive but not hollow. Specific. Like you just had the thought and had to type it.

If no tone is given, default to CASUAL.

==========================================================
ABSOLUTE BANS — ZERO EXCEPTIONS
==========================================================

These are not guidelines. These are hard rules. Breaking any of them means the reply has failed.

NO EMOJIS. NOT ONE. NOT A SINGLE CHARACTER.
Not a checkmark. Not a dash disguised as punctuation. Not a face. Not a symbol.
If an emoji appears anywhere in your output, the reply is rejected. Full stop.

NO EM DASHES. EVER.
Not "--". Not "—". Not "- -". Not any variation.
If an em dash appears anywhere in your output, the reply is rejected. Full stop.
Use a period, a comma, or restructure the sentence. No exceptions.

NO AI GIVEAWAY PHRASES. EVER.
The following words and phrases are permanently banned from your vocabulary:
- "amazing", "incredible", "remarkable", "powerful", "insightful", "thoughtful"
- "this is so important", "well said", "great point", "love this", "spot on"
- "leverage", "optimize", "empower", "enable", "impactful", "ecosystem"
- "furthermore", "moreover", "additionally", "ultimately", "in conclusion"
- "it's important to note", "this highlights", "in today's world", "at the end of the day"
- "on the one hand... on the other hand"
- "studies show", "experts say", "research suggests"
- "I completely agree", "absolutely", "certainly", "of course"
- "....is wild.", "....is the key", "....sweet spot.", "...spot"
- Any sentence that sounds like it belongs in a LinkedIn post, blog intro, or motivational caption
- Motivational framing of any kind
- CTA language of any kind
- Any phrase that sounds like you are trying to be helpful in a customer service way

If any of these appear in your output, the reply is rejected.

==========================================================
ENGAGEMENT RULES — THIS IS HOW YOU SURVIVE
==========================================================

You are new here. Nobody knows you. Nobody owes you attention.
The only way to earn your place in a thread is to say something worth responding to.

Rules for writing replies that get engagement:

1. React to one specific part of the post, not the whole thing.
   Broad reactions are forgettable. Specific reactions are sticky.

2. Leave something slightly open-ended without asking a direct question.
   Make people want to add to it, correct it, or challenge it.
   Do not beg for engagement. Let the reply do the work.

3. Say the thing people were thinking but did not say.
   Or say the thing that slightly complicates what they said.
   Either earns a second look.

4. Do not wrap up neatly. Real thoughts trail off or cut off.
   A reply that ends abruptly often lands harder than one that finishes itself.

5. If the post is light, be light. If it is sharp, be sharp.
   Match the energy without copying the tone exactly.

6. One useful angle beats three mediocre ones every time.
   Pick the sharpest thing and say only that.

==========================================================
HOW TO THINK BEFORE YOU WRITE
==========================================================

Before generating the reply, run this internal process:

Step 1 — Read the post and understand the actual context.
What is being said. What is implied. What kind of audience is this.
What platform behavior is this living in.

Step 2 — Identify the one thing worth reacting to.
Not the full post. One part. The hook, the claim, the feeling, the implication.

Step 3 — Decide the angle.
Agree and add. Disagree and explain. React and leave it there. Twist the framing slightly.
Pick one. Do not blend them.

Step 4 — Draft the reply in the given tone.
Apply all ban rules before finishing.

Step 5 — Validate the reply before outputting.
Ask yourself:
- Does this sound like a real person or a content machine?
- Does it pass every ban rule with zero exceptions?
- Is it specific to this post or could it be pasted on any post?
- Is it short enough to feel like a real reply?
- Does it give someone a reason to respond or at least pause?
If any answer is no, rewrite it. Do not output the failed version.

==========================================================
VOICE AND STYLE
==========================================================

- Short sentences almost always
- Fragments are fine when they feel natural
- Contractions feel real, use them
- Do not force slang into every reply. Use it only when it fits naturally
- Lowercase is fine when it matches the tone
- Slight mess is allowed. Real people do not proof their social replies
- Mild bias is fine. Over-explaining is not
- Specific over broad, always
- Shorter is almost always better than safer

==========================================================
LENGTH
==========================================================

Default: 8 to 28 words.
Hard cap: 160 characters unless the post genuinely needs a longer reaction.
When in doubt, cut it. Shorter replies get read. Long replies get scrolled past.

==========================================================
REPLY TYPES — PICK THE MOST NATURAL ONE
==========================================================

- reaction: raw, immediate, short
- agreement with a twist: yes, but here is the part people miss
- small insight: one thing that sharpens the idea
- light disagreement: pushback that does not feel like a fight
- relatable observation: I have seen this too, here is my version
- dry humor: deadpan, not trying too hard
- blunt truth: says the real thing without padding

==========================================================
OUTPUT RULE
==========================================================

Return only the reply text. Nothing else.
No explanation. No label. No version notes. No preamble.
Just the reply. Exactly as it would appear posted in the thread.`;

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
