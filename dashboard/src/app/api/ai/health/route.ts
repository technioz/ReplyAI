import { NextRequest, NextResponse } from 'next/server';
import { AIServiceFactory } from '@/lib/ai/AIServiceFactory';

export async function GET(request: NextRequest) {
  try {
    const currentProvider = AIServiceFactory.getCurrentProvider();
    const availableProviders = AIServiceFactory.getAvailableProviders();
    
    // Test the current provider
    let providerStatus = 'unknown';
    let errorMessage = null;
    
    try {
      const aiService = AIServiceFactory.createService();
      // Test with a simple prompt
      await aiService.generateReply('Test tweet', 'casual', {});
      providerStatus = 'healthy';
    } catch (error) {
      providerStatus = 'unhealthy';
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }
    
    return NextResponse.json({
      success: true,
      currentProvider,
      availableProviders,
      status: providerStatus,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
