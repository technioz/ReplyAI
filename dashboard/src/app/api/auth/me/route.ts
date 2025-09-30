import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import { authenticateUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    // Connect to database
    await dbConnect();
    
    // Authenticate user
    const userPayload = await authenticateUser(request);
    
    // Get full user data from database
    const User = (await import('@/lib/models/User')).default;
    const user = await User.findById(userPayload.id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        apiKey: user.apiKey,
        status: user.status,
        credits: user.credits,
        hasActiveSubscription: user.hasActiveSubscription,
        subscription: user.subscription,
        preferences: user.preferences,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });

  } catch (error) {
    return handleApiError(error);
  }
}
