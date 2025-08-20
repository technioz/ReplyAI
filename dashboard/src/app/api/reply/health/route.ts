import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    // Test connection to AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'https://ai.technioz.com/webhook/replyai-webhook';
    
    let isAIServiceHealthy = false;
    let responseTime = 'unknown';
    
    try {
      const startTime = Date.now();
      const testResponse = await fetch(aiServiceUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      const endTime = Date.now();
      
      isAIServiceHealthy = testResponse.ok;
      responseTime = `${endTime - startTime}ms`;
    } catch (error) {
      console.log('AI service health check failed:', error);
      isAIServiceHealthy = false;
    }

    return NextResponse.json({
      success: true,
      service: 'Reply Generation Service',
      status: 'healthy',
      aiService: {
        url: aiServiceUrl,
        status: isAIServiceHealthy ? 'healthy' : 'unhealthy',
        responseTime: responseTime
      },
      features: {
        freeCredits: true,
        authenticatedUsers: true,
        toneVariations: 6,
        maxTweetLength: 2000
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: true,
      service: 'Reply Generation Service',
      status: 'healthy',
      aiService: {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: new Date().toISOString()
    });
  }
}
