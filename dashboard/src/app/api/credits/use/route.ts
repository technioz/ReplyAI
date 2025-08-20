import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await validateApiKey(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { amount = 1 } = body;
    
    if (amount <= 0 || amount > 10) {
      return NextResponse.json({ 
        success: false, 
        error: 'VALIDATION_ERROR',
        message: 'Credit amount must be between 1 and 10' 
      }, { status: 400 });
    }

    try {
      await user.useCredits(amount);
      
      return NextResponse.json({
        success: true,
        message: `${amount} credit${amount > 1 ? 's' : ''} used successfully`,
        credits: {
          available: user.credits.available,
          used: user.credits.used,
          total: user.credits.total
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Insufficient credits') {
        return NextResponse.json({ 
          success: false, 
          error: 'CREDITS_EXHAUSTED',
          message: 'Insufficient credits available' 
        }, { status: 402 });
      }
      throw error;
    }

  } catch (error) {
    return handleApiError(error);
  }
}
