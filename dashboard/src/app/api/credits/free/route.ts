import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    const freeCreditsLimit = parseInt(process.env.FREE_CREDITS_LIMIT || '50');
    
    // Get current usage from in-memory cache
    const today = new Date().toDateString();
    const key = `${clientIP}_${today}`;
    
    // Initialize global cache if it doesn't exist
    if (!(global as any).freeCreditsUsage) {
      (global as any).freeCreditsUsage = new Map();
    }
    
    const currentUsage = (global as any).freeCreditsUsage.get(key) || 0;
    
    return NextResponse.json({
      success: true,
      freeCredits: {
        limit: freeCreditsLimit,
        used: currentUsage,
        available: Math.max(0, freeCreditsLimit - currentUsage),
        resetsAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
      },
      message: currentUsage >= freeCreditsLimit ? 
        'Free credits exhausted. Please sign up to continue.' : 
        `You have ${freeCreditsLimit - currentUsage} free credits remaining today.`,
      signupUrl: `${process.env.NEXT_PUBLIC_DASHBOARD_URL}/signup`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}
