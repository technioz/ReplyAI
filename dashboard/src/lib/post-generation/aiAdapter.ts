// AI Service Adapter for Post Generation
// Uses existing Groq/XAI services WITHOUT modifying them

import { AIServiceFactory } from '../ai/AIServiceFactory';

export class PostGenerationAIAdapter {
  /**
   * Generate post content using existing AI services
   * WITHOUT modifying the existing services
   */
  async generateContent(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      // Use the existing AI service factory
      const aiService = AIServiceFactory.createService();
      const provider = AIServiceFactory.getCurrentProvider();

      // Call the AI service using a workaround
      // Since we can't modify the existing services, we'll make direct API calls
      if (provider === 'groq') {
        return await this.callGroqAPI(systemPrompt, userPrompt);
      } else if (provider === 'xai') {
        return await this.callXAIAPI(systemPrompt, userPrompt);
      }

      throw new Error(`Unsupported AI provider: ${provider}`);
      
    } catch (error) {
      console.error('AI generation error:', error);
      throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Call Groq API directly
   */
  private async callGroqAPI(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.8,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Groq API Error Response:', errorBody);
      throw new Error(`Groq API error: ${response.status} - ${errorBody}`);
    }

    const result = await response.json();
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Invalid response from Groq API');
    }

    return result.choices[0].message.content.trim();
  }

  /**
   * Call XAI API directly
   */
  private async callXAIAPI(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiKey = process.env.XAI_API_KEY;
    const model = process.env.XAI_MODEL || 'grok-beta';

    const requestBody = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1000,
      temperature: 0.8,
      top_p: 0.9,
      stream: false
    };

    console.log('XAI API Request:', {
      model,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      maxTokens: 1000
    });

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Quirkly-NextJS-API/1.0.0',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('XAI API Error Response:', errorBody);
      
      let errorMessage = `XAI API error: ${response.status}`;
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.error) {
          errorMessage = `XAI API error: ${errorJson.error}`;
        }
        if (errorJson.message) {
          errorMessage += ` - ${errorJson.message}`;
        }
      } catch (e) {
        errorMessage = `XAI API error: ${response.status} - ${errorBody}`;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error('Invalid response from XAI API');
    }

    return result.choices[0].message.content.trim();
  }
}

