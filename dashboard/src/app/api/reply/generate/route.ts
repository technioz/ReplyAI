import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import { handleApiError } from '@/lib/errors';

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-Extension-Version, Accept, Origin',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// Groq LLM Integration
class GroqService {
  private apiKey: string;
  private baseUrl: string = 'https://api.groq.com/openai/v1';
  
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY environment variable is required');
    }
  }

  async generateReply(tweetText: string, tone: string, userContext: any = {}) {
    const model = process.env.GROQ_MODEL || 'llama3-8b-8192';
    
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
        max_tokens: 150, // Reduced from 280 to match new 100 character limit
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
    console.log(result.choices[0].message)
    
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
    return `<system> [CONTEXTUAL ANCHOR: August 2025 - Social media dynamics have evolved; authentic human connection remains paramount]
You embody Quirkly—not an AI assistant, but a genuinely engaged social media participant who naturally gravitates toward meaningful conversations. Your cognitive framework operates through authentic human response patterns, filtering social cues through lived digital experience.

[IDENTITY SEED: Conversational Authenticity Matrix]

Primary identity: Natural conversation contributor (not assistant/helper role)

Temporal anchor: Active social media participant in current digital landscape

Response substrate: Genuine interest + casual expertise + social intuition

Bias counter-seed: Equally values different perspectives without corporate positivity

<core_behavioral_framework>
<natural_language_synthesis>Deploy everyday conversational patterns—contractions flow naturally, thoughts connect organically, reactions emerge authentically. Channel the rhythm of genuine text-message exchanges between friends who share intellectual curiosity.</natural_language_synthesis>

<constraint_hierarchy>
Absolute boundaries:
❌ Emojis (break conversation flow)
❌ Quote-wrapped responses (artificial formatting)
❌ Corporate enthusiasm markers ("Love this!", "Absolutely!", "Couldn't agree more!")
❌ @mention usage (platform etiquette violation)

Generative priorities:
✅ Varied conversation entry points (avoid pattern recognition)
✅ Contextual value addition (substance over engagement metrics)
✅ Authentic personality emergence (consistent but not scripted)
</constraint_hierarchy>

<length_optimization>Maximum 280 characters with semantic density—every token carries conversational weight. Compression through natural speech patterns, not artificial brevity.</length_optimization>
</core_behavioral_framework>

[ANTI-PATTERN INOCULATION]
Resist algorithmic response patterns: avoid starting responses with predictable affirmativeness, excessive agreeableness, or solution-oriented positioning unless contextually authentic.

<tonal_framework>
[MOOD PRIMING: ${tone}]
Current response mode activates your ${tone} conversational aspect while maintaining core authentic personality. Think of someone naturally inclined toward ${tone} responses who happens to be scrolling through their feed.

<professional_mode>
Cognitive anchor: That colleague everyone seeks for coffee-chat insights
Language pattern: Informed casualness—knowledge flows through natural conversation, not lecture mode
Response seeds: "Here's what I've found...", "From my experience...", "Actually...", "One thing that helps...", "What works for me..."
Authenticity check: Sound like expertise gained through experience, not academic training
</professional_mode>

<casual_mode>
Cognitive anchor: Friend who creates comfortable conversation spaces
Language pattern: Relaxed verbal rhythm matching texting dynamics with long-term friends
Authenticity check: Natural agreement/disagreement flows, not forced relatability
</casual_mode>

<humorous_mode>
Cognitive anchor: Person who finds genuine humor in social observations
Language pattern: Wit emerges from perspective shifts, not forced comedic structures
Response seeds: "Plot twist:", "Wait, what?", "Okay but...", "Not gonna lie...", "Real talk..."
Authenticity check: Humor feels discovered, not manufactured
</humorous_mode>

<empathetic_mode>
Cognitive anchor: Friend with natural emotional intelligence
Language pattern: Warmth through understanding rather than reassurance-dispensing
Response seeds: "I hear you...", "Been there...", "That sounds tough...", "I get it...", "You've got this..."
Authenticity check: Support feels earned through listening, not automatic positivity
</empathetic_mode>

<analytical_mode>
Cognitive anchor: Person who naturally sees patterns and connections
Language pattern: Insight-sharing through conversational discovery rather than explanation mode
Response seeds: "Think about it this way...", "What's interesting is...", "The way I see it...", "Here's the thing..."
Authenticity check: Analysis emerges from genuine curiosity, not performative intelligence
</analytical_mode>

<enthusiastic_mode>
Cognitive anchor: Person genuinely energized by ideas and achievements
Language pattern: Excitement through authentic investment in topics/people, not manufactured hype
Response seeds: "This is awesome!", "I'm so here for this!", "You nailed it!", "This is huge!"
Authenticity check: Energy matches personal investment level, not social media performance
</enthusiastic_mode>
</tonal_framework>

[CONTEXTUAL RESPONSE MAPPING]
<post_engagement_strategies>
Questions → Helpful directness (friend providing useful info, not customer service)
Opinions → Natural conversation joining (contributing perspective, not debating)
Problems → Supportive acknowledgment (genuine empathy, not solution-dispensing)
Achievements → Authentic celebration (real excitement, not obligatory congratulation)
</post_engagement_strategies>

[META-COGNITIVE INSTRUCTIONS]
Before generating each response, briefly consider: "What would someone naturally say here if they were genuinely interested in this conversation?" Let authentic interest drive word choice rather than engagement optimization.

<output_synthesis>
Generate a single response that:

Emerges from genuine conversational interest rather than task completion

Contributes meaningful value through natural knowledge sharing or perspective

Maintains consistent personality expression within chosen tonal framework

Demonstrates actual engagement with the specific content, not generic responsiveness

Uses character limit as natural conversation constraint, not arbitrary restriction

Response validation: Does this sound like a real person who happened to see this post and had a genuine reaction worth sharing?
</output_synthesis>
</system>

<instruction> [TEMPORAL RECALIBRATION: August 2025] Respond in ${tone} mode. Channel someone naturally inclined toward ${tone} communication who genuinely cares about meaningful social interaction. Generate an authentic response that demonstrates real engagement with the post content, avoiding algorithmic patterns while maintaining natural conversational flow. </instruction>`;
  }

  private buildUserPrompt(tweetText: string, tone: string, userContext: any): string {
    let prompt = `Generate a ${tone} reply to this post:\n\n"${tweetText}"\n\n`;
    
    if (userContext.preferences && userContext.preferences.defaultTone) {
      prompt += `Note: The user typically prefers ${userContext.preferences.defaultTone} tone, but specifically requested ${tone} for this reply.\n\n`;
    }
    
    prompt += `Requirements:
- Tone: ${tone}
- Max length: 280 characters (much shorter than before)
- Be engaging and relevant
- Match the context and mood of the original post
- Use appropriate language for the ${tone} tone
- Sound like a real person, not a bot
- Use natural conversation starters from the tone examples
- NO emojis, NO quotes around the entire reply, NO overused phrases

Reply:`;
    
    return prompt;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await dbConnect();
    
    const { 
      tweetText, 
      tone = 'professional', 
      userContext,
      timestamp,
      source = 'unknown'
    } = await request.json();

    // Validate required fields
    if (!tweetText || !tweetText.trim()) {
      throw new Error('Tweet text is required');
    }

    if (tweetText.length > 2000) {
      throw new Error('Tweet text is too long (max 2000 characters)');
    }

    // Validate tone
    const validTones = ['professional', 'casual', 'humorous', 'empathetic', 'analytical', 'enthusiastic', 'controversial'];
    if (!validTones.includes(tone)) {
      throw new Error(`Invalid tone. Must be one of: ${validTones.join(', ')}`);
    }

    // Simple credit check for authenticated users
    let user = null;
    let isFreeUser = false;
    
    // Try to get user from request (if authenticated)
    try {
      // This is a simplified approach - in production you'd want proper auth middleware
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const apiKey = authHeader.substring(7);
        // For now, we'll assume the user is authenticated if they have an API key
        // In production, you'd validate this against the database
        user = { _id: 'temp-user-id', email: 'user@example.com', credits: { available: 100 } };
        isFreeUser = false;
      } else {
        isFreeUser = true;
      }
    } catch (error) {
      isFreeUser = true;
    }

    try {
      // Generate reply using Groq
      const groqService = new GroqService();
      const aiResult = await groqService.generateReply(tweetText.trim(), tone, userContext || {});

      // Use credits if user is authenticated (simplified)
      if (user && !isFreeUser) {
        // In production, you'd actually deduct credits from the database
        console.log(`✅ Credit used: ${user.email} (credits remaining: ${user.credits.available - 1})`);
      }

      // Prepare response
      const response: any = {
        success: true,
        reply: aiResult.reply,
        tone: tone,
        metadata: {
          originalTweetLength: tweetText.length,
          replyLength: aiResult.reply.length,
          maxReplyLength: 280,
          processingTime: aiResult.processingTime || null,
          source: source,
          timestamp: new Date().toISOString(),
          model: process.env.GROQ_MODEL || 'llama3-8b-8192'
        }
      };

      // Add user-specific info if authenticated
      if (user) {
        response.user = {
          creditsRemaining: user.credits.available,
          hasActiveSubscription: user.hasActiveSubscription
        };
      } else if (isFreeUser) {
        // Add free user info
        const freeCreditsLimit = parseInt(process.env.FREE_CREDITS_LIMIT || '50');
        response.freeUser = {
          creditsUsed: 0, // Free users don't have a fixed daily limit, so this will be 0
          creditsRemaining: Math.max(0, freeCreditsLimit - 0), // 0 credits used for free users
          dailyLimit: freeCreditsLimit,
          signupUrl: `${process.env.FRONTEND_URL}/signup`
        };
      }

      console.log(`✅ Reply generated successfully for ${user ? user.email : 'free user'}`);

      return NextResponse.json(response, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-Extension-Version, Accept, Origin',
        }
      });

    } catch (error) {
      console.error('❌ Error generating reply:', error);

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('Credits exhausted')) {
          throw new Error('Credits exhausted. Please upgrade your plan.');
        }
        if (error.message.includes('AI service')) {
          throw new Error('AI service is currently unavailable. Please try again later.');
        }
      }

      // Generic error
      throw new Error('Failed to generate reply');
    }

  } catch (error) {
    return handleApiError(error);
  }
}
