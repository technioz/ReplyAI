import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import { authenticateUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    // Connect to database
    await dbConnect();
    
    // Authenticate user
    const user = await authenticateUser(request);
    
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
