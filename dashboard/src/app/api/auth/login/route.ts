import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';
import { AppError, handleApiError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await dbConnect();
    
    const body = await request.json();
    const { email, password, action, timestamp, source } = body;

    // Check if user exists and password is correct
    const user = await User.findOne({ email }).select('+password').exec();

    if (!user || !(await user.correctPassword(password))) {
      // Increment login attempts if user exists
      if (user) {
        await user.incLoginAttempts();
      }
      throw AppError.invalidCredentials();
    }

    // Check if account is locked
    if (user.isLocked) {
      throw AppError.accountLocked();
    }

    // Check if account is active
    if (user.status !== 'active') {
      throw AppError.accountInactive();
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login info
    user.lastLoginAt = new Date();
    user.lastLoginIP = request.ip || 'unknown';

    // Create session token for dashboard
    const userAgent = request.headers.get('User-Agent') || 'unknown';
    const ipAddress = request.ip || 'unknown';
    const sessionToken = user.createSessionToken(userAgent, ipAddress);
    
    // Clean expired sessions AFTER adding the new one
    user.cleanExpiredSessions();
    
    // Save user with new session and cleaned sessions
    await user.save();
    
    console.log(`🔍 Login - sessions after cleanup:`, user.sessions.length);
    console.log(`🔍 Login - new session token:`, sessionToken ? `${sessionToken.substring(0, 10)}...` : 'none');

    // Log successful login
    console.log(`✅ User logged in: ${email} from ${source || 'unknown'}`);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        apiKey: user.apiKey,
        status: user.status,
        role: user.role,
        credits: user.credits,
        hasActiveSubscription: user.hasActiveSubscription,
        subscription: user.subscription,
        preferences: user.preferences,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      },
      token: sessionToken,
      sessionToken,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}
