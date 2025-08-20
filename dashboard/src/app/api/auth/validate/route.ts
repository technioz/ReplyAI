import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';
import { AppError, handleApiError } from '@/lib/errors';

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// Simple health check for extensions
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    return NextResponse.json({
      success: true,
      message: 'API validation endpoint is working',
      timestamp: new Date().toISOString(),
      status: 'healthy'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'API validation endpoint is not working',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      status: 'unhealthy'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔑 API validation request received');
    console.log('🔑 Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Connect to database
    await dbConnect();
    console.log('✅ Database connected');
    
    const body = await request.json();
    const { apiKey, action, timestamp, source } = body;
    
    console.log('🔑 Request body:', { 
      hasApiKey: !!apiKey, 
      action, 
      source, 
      timestamp,
      apiKeyType: typeof apiKey,
      apiKeyPreview: apiKey && typeof apiKey === 'string' ? `${apiKey.substring(0, 10)}...` : 'none'
    });

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'INVALID_API_KEY_FORMAT',
        message: 'API key is required and must be a string',
        details: 'Please provide a valid API key',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Check database connection first
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log(`❌ Database not ready, state: ${mongoose.connection.readyState}`);
      return NextResponse.json({
        success: false,
        error: 'DATABASE_ERROR',
        message: 'Database connection not ready, please try again',
        details: `Connection state: ${mongoose.connection.readyState}`,
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    // Find user by API key with timeout
    let user;
    try {
      user = await Promise.race([
        (User as any).findByApiKey(apiKey),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 8000)
        )
      ]);
    } catch (error) {
      if (error instanceof Error && error.message === 'Database query timeout') {
        console.log(`⏰ Database query timed out for API key validation`);
        return NextResponse.json({
          success: false,
          error: 'TIMEOUT_ERROR',
          message: 'Database query timeout, please try again',
          details: 'The request took too long to process',
          timestamp: new Date().toISOString()
        }, { status: 408 });
      }
      throw error;
    }
    
    if (!user) {
      console.log(`❌ API key not found in database`);
      return NextResponse.json({
        success: false,
        error: 'INVALID_API_KEY',
        message: 'API key is invalid or not found',
        details: 'Please check your API key and try again',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    console.log(`✅ API key found for user: ${user.email}`);

    // Check if account is active
    if (user.status !== 'active') {
      console.log(`❌ Account not active: ${user.status}`);
      return NextResponse.json({
        success: false,
        error: 'ACCOUNT_INACTIVE',
        message: 'Account is not active',
        details: `Account status: ${user.status}`,
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    // Check if account is locked
    if (user.isLocked) {
      console.log(`❌ Account is locked for user: ${user.email}`);
      return NextResponse.json({
        success: false,
        error: 'ACCOUNT_LOCKED',
        message: 'Account is temporarily locked',
        details: 'Too many failed login attempts. Please try again later.',
        timestamp: new Date().toISOString()
      }, { status: 423 });
    }

    // Update last login
    user.lastLoginAt = new Date();
    user.lastLoginIP = request.ip || 'unknown';
    await user.save();

    console.log(`✅ API key validated: ${user.email} from ${source || 'unknown'}`);

    return NextResponse.json({
      success: true,
      message: 'API key is valid',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        status: user.status,
        credits: user.credits,
        hasActiveSubscription: user.hasActiveSubscription,
        subscription: user.subscription,
        preferences: user.preferences,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        // Add fields needed by the Chrome extension
        apiCallsUsed: user.apiCallsUsed || 0,
        apiCallsLimit: user.apiCallsLimit || 100,
        // Add subscription info for better display
        subscriptionStatus: user.hasActiveSubscription ? 'Active' : 'Inactive',
        subscriptionPlan: user.subscription?.plan?.name || 'Free',
        // Add usage statistics
        totalApiCalls: user.totalApiCalls || 0,
        monthlyApiCalls: user.monthlyApiCalls || 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ API validation error:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
