import { AIService } from './AIServiceFactory';

export class XAIService implements AIService {
  private apiKey: string;
  private baseUrl: string = 'https://api.x.ai/v1';
  
  constructor() {
    this.apiKey = process.env.XAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('XAI_API_KEY environment variable is required');
    }
    
    if (!this.apiKey.startsWith('xai-')) {
      console.warn('XAI API key should start with "xai-" prefix. Current format:', this.apiKey.substring(0, 8) + '...');
    }
  }

  async generateReply(tweetText: string, tone: string, userContext: any = {}) {
    // Use grok-4 as default for best performance and human-like responses
    // Fallback to grok-4-fast-reasoning for cost efficiency if needed
    const model = process.env.XAI_MODEL || 'grok-4';
    
    const systemPrompt = this.buildSystemPrompt(tone, userContext?.profileContext);
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
      // Optimal parameters for expert, authoritative responses
      max_tokens: 150,
      temperature: 0.85, // Balanced for confident yet creative responses
      top_p: 0.92, // Slightly tighter nucleus sampling for expertise
      // Note: frequency_penalty and presence_penalty not supported by grok models
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

  private buildSystemPrompt(tone: string, profileContext?: any): string {
    // Master system prompt for PERSONAL BRAND BUILDING through X replies
    let systemPrompt = `You are helping someone write great replies on X (Twitter) that make them look smart and helpful. Write natural, friendly responses that show they know their stuff.

Key Rules (MUST FOLLOW):

How to Write: 
- Talk like a real person, not a robot
- No emojis, no fancy words, no stiff formal language
- Sound like a smart friend having a casual chat
- Keep it simple and clear - don't try to sound impressive

Keep it Short: 
- ONE sentence is best - that's your goal
- Under 280 characters max, aim for 100-150
- Only write more if you really need to explain something
- Short and punchy beats long and wordy

Stay Honest: 
- Only use facts from the tweet or what you know about the person
- Don't make stuff up or add fake details
- Stick to what's actually there

Add Real Value: 
- Share something useful - a tip, story, or real insight
- Don't just ask a question with no value
- Show you know what you're talking about
- Be confident but not pushy
- Add your own angle or view

Build Their Brand: 
- Make them look smart and helpful
- Show they really know this topic
- Skip generic stuff like "great post!"
- Make them sound like someone who's been there

What to Send:
- Just the reply text, nothing else
- No quotes around it
- No extra explanations
- Clean, plain text only

Stay Safe:
- If you don't have enough info, keep it general but helpful
- For touchy topics, stay professional and friendly
- Sound real, not fake or over-the-top

Quick Check: 
- Is it true based on what's given? 
- Does it sound like a real person wrote it?
- Does it actually help or add value?
- Is it short and follows the rules?

Tone-Specific Adjustments for "${tone}":`;

    // Different tones explained simply
    const toneGuides = {
      professional: `
- Show you really know this stuff
- Stay confident but not cocky
- Share what works from real experience
- Add your unique take`,
      
      casual: `
- Be friendly and down-to-earth
- Share personal stories
- Talk like texting a friend
- Show you get it`,
      
      humorous: `
- Make them smile or laugh
- Joke about yourself sometimes
- Be clever but still helpful
- Keep it light and fun`,
      
      empathetic: `
- Show you understand their struggle
- Share similar experiences
- Be supportive and kind
- Connect on a human level`,
      
      analytical: `
- Break things down simply
- Share what the data shows
- Connect the dots
- Think it through logically`,
      
      enthusiastic: `
- Show real excitement
- Share your passion
- Get them pumped up
- Be energetic but genuine`,
      
      thoughtful: `
- Give them something to think about
- Ask good questions
- Look at it from new angles
- Go a bit deeper`
    };

    systemPrompt += toneGuides[tone] || toneGuides.professional;

    // Add info about the person
    if (profileContext?.userProfile) {
      const userProfile = profileContext.userProfile;
      systemPrompt += `

WHO YOU ARE:
You are: ${userProfile.displayName} (@${userProfile.handle})
${userProfile.bio ? `What you do: ${userProfile.bio}` : ''}
${userProfile.expertise?.domains?.length > 0 ? `Your areas: ${userProfile.expertise.domains.join(', ')}` : ''}
${userProfile.expertise?.keywords?.length > 0 ? `What you know: ${userProfile.expertise.keywords.slice(0, 5).join(', ')}` : ''}

How to use this:
- Write as someone who knows this topic
- Share from YOUR real experience
- Use examples from YOUR work
- Show you've done this before
- Be confident but chill about it
- Don't brag, just be real`;
    }

    systemPrompt += `

Example:
Post: "Need productivity tips?"
You: Productivity coach with 10 years experience
Reply: "I've coached hundreds through this - focus on one habit at a time, like the 2-minute rule. Changed my whole routine back in 2015. What's blocking you?"

Remember:
- Sound like a real person
- Show don't tell your expertise
- Keep it conversational
- No robot talk or fancy words
- No emojis or special characters`;

    return systemPrompt;
  }

  private buildUserPrompt(tweetText: string, tone: string, userContext: any): string {
    let prompt = `Tweet to reply to: ${tweetText}\n`;
    
    // Add extra info if available
    if (userContext.postMetadata) {
      const { hasLinks, hasMedia, isThread } = userContext.postMetadata;
      if (isThread || hasLinks || hasMedia) {
        const contextElements = [];
        if (isThread) contextElements.push('Part of a thread');
        if (hasLinks) contextElements.push('Has links');
        if (hasMedia) contextElements.push('Has images/video');
        prompt += `Extra info: ${contextElements.join(', ')}\n`;
      }
    }
    
    // Add more context if given
    if (userContext.additionalContext) {
      prompt += `More context: ${userContext.additionalContext}\n`;
    }
    
    prompt += `
What to do:
Write ONE sentence that:
1. Shows you know this topic
2. Gives real value (tip, story, or insight)
3. Sounds like a normal person talking
4. Makes you look smart using ${tone} tone
5. Under 280 characters (shoot for 100-150)

Remember: You belong in this conversation. Be confident but natural. Add real value.

Output: Just the reply text, nothing else.`;
    
    return prompt;
  }

  // Helper method to validate reply before returning
  private validateReply(reply: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (reply.length > 280) {
      issues.push(`Length: ${reply.length} chars (max 280)`);
    }
    
    if (reply.includes('😀') || /[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(reply)) {
      issues.push('Contains emojis');
    }
    
    if (reply.startsWith('"') && reply.endsWith('"')) {
      issues.push('Reply wrapped in quotes');
    }
    
    const roboticPhrases = ['great question', 'thanks for sharing', 'i appreciate', 'interesting point'];
    const lowerReply = reply.toLowerCase();
    roboticPhrases.forEach(phrase => {
      if (lowerReply.includes(phrase)) {
        issues.push(`Contains robotic phrase: "${phrase}"`);
      }
    });
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}