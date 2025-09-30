import { NextRequest, NextResponse } from 'next/server';
import { AIServiceFactory } from '@/lib/ai/AIServiceFactory';

export async function GET(request: NextRequest) {
  try {
    const currentProvider = AIServiceFactory.getCurrentProvider();
    const availableProviders = AIServiceFactory.getAvailableProviders();
    
    // Get environment configuration
    const config = {
      currentProvider,
      availableProviders,
      environment: {
        AI_PROVIDER: process.env.AI_PROVIDER || 'groq',
        GROQ_API_KEY: process.env.GROQ_API_KEY ? '***configured***' : 'not configured',
        XAI_API_KEY: process.env.XAI_API_KEY ? '***configured***' : 'not configured',
        GROQ_MODEL: process.env.GROQ_MODEL || 'llama3-8b-8192',
        XAI_MODEL: process.env.XAI_MODEL || 'grok-3'
      }
    };
    
    return NextResponse.json({
      success: true,
      ...config,
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
