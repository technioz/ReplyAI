import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

// API key validation for Chrome extension requests
async function validateApiKey(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    console.log('🔍 Credit Use - Auth header:', authHeader?.substring(0, 30) + '...');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Credit Use - No Bearer token found');
      return null;
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('🔍 Credit Use - API key extracted:', apiKey?.substring(0, 20) + '...');
    
    if (!apiKey || apiKey.length < 10) {
      console.log('❌ Credit Use - API key too short or missing');
      return null;
    }

    // Find user by API key
    const user = await User.findByApiKey(apiKey);
    console.log('🔍 Credit Use - User found:', user ? `${user.email} (${user.id})` : 'null');
    
    if (!user || user.status !== 'active') {
      console.log('❌ Credit Use - User not found or inactive');
      return null;
    }

    console.log('✅ Credit Use - Validation successful');
    return user;
  } catch (error) {
    console.error('❌ Credit Use - Validation error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    console.log('🔍 Credit Use - Request received');
    
    const user = await validateApiKey(request);
    if (!user) {
      console.log('❌ Credit Use - Authentication failed, returning 401');
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Valid API key is required',
        hint: 'Make sure you are sending the API key in Authorization: Bearer <key> header'
      }, { status: 401 });
    }
    
    console.log('✅ Credit Use - User authenticated:', user.email);

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
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
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

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-Extension-Version',
      'Access-Control-Max-Age': '86400'
    }
  });
}
