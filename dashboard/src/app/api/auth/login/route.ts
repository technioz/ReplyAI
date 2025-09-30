import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';
import { AppError, handleApiError } from '@/lib/errors';
import { createSendToken } from '@/lib/middleware/auth';

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
    
    // Save user with updated login info
    await user.save();

    // Log successful login
    console.log(`✅ User logged in: ${email} from ${source || 'unknown'}`);

    // Create and send JWT token
    return createSendToken(user, 200, 'Login successful');

  } catch (error) {
    return handleApiError(error);
  }
}
