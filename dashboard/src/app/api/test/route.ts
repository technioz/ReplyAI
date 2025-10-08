import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

// Simple test endpoint for extensions
export async function GET(request: NextRequest) {
  try {
    // Test database operations
    let dbTestResult = 'not tested';
    let userCount = 0;
    let dbHealthy = false;
    
    try {
      await dbConnect();
      userCount = await User.countDocuments();
      dbTestResult = `connected - ${userCount} users found`;
      dbHealthy = true;
    } catch (error) {
      dbTestResult = `connection failed: ${error instanceof Error ? error.message : 'unknown'}`;
      dbHealthy = false;
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test endpoint is working',
      database: {
        healthy: dbHealthy,
        status: dbHealthy ? 'connected' : 'disconnected',
        testResult: dbTestResult,
        userCount: userCount,
        timestamp: new Date().toISOString()
      },
      server: {
        status: 'running',
        environment: process.env.NODE_ENV || 'unknown',
        timestamp: new Date().toISOString()
      },
      headers: Object.fromEntries(request.headers.entries()),
      method: request.method,
      url: request.url
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Test endpoint error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🧪 Test POST endpoint received:', body);
    console.log('🧪 API Key type:', typeof body.apiKey);
    console.log('🧪 API Key value:', body.apiKey);
    
    return NextResponse.json({
      success: true,
      message: 'Test POST endpoint is working',
      receivedData: body,
      apiKeyInfo: {
        hasApiKey: !!body.apiKey,
        type: typeof body.apiKey,
        value: body.apiKey,
        length: body.apiKey ? body.apiKey.length : 0
      },
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries()),
      method: request.method,
      url: request.url
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Test POST endpoint error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}

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
