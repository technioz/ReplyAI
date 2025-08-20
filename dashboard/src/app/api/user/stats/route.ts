import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/middleware/auth';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    const user = authResult.user;
    
    // Connect to database
    await dbConnect();
    
    // Get fresh user data
    const freshUser = await User.findById(user.id).exec();
    if (!freshUser) {
      return NextResponse.json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Return user statistics
    return NextResponse.json({
      success: true,
      stats: {
        credits: freshUser.credits || 0,
        apiCallsUsed: freshUser.apiCallsUsed || 0,
        apiCallsLimit: freshUser.apiCallsLimit || 100,
        totalApiCalls: freshUser.totalApiCalls || 0,
        monthlyApiCalls: freshUser.monthlyApiCalls || 0,
        hasActiveSubscription: freshUser.hasActiveSubscription || false,
        subscriptionPlan: freshUser.subscription?.plan?.name || 'Free',
        subscriptionStatus: freshUser.hasActiveSubscription ? 'Active' : 'Inactive',
        lastLoginAt: freshUser.lastLoginAt,
        accountStatus: freshUser.status
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ User stats error:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get user statistics',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
