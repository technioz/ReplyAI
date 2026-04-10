import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';
import { AppError, handleApiError } from '@/lib/errors';
import { createSendToken } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { email, password, action, timestamp, source } = body;

    const user = await User.findOne({ email }).select('+password +loginAttempts +lockedUntil').exec();

    if (!user) {
      throw AppError.invalidCredentials();
    }

    // Check lock BEFORE password verification to avoid incrementing attempts on locked accounts
    if (user.isLocked) {
      throw AppError.accountLocked();
    }

    // Check if account is active
    if (user.status !== 'active') {
      throw AppError.accountInactive();
    }

    // Now verify password
    if (!(await user.correctPassword(password))) {
      await user.incLoginAttempts();
      throw AppError.invalidCredentials();
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login info
    user.lastLoginAt = new Date();
    user.lastLoginIP = request.ip || 'unknown';
    
    await user.save();

    console.log(`✅ User logged in: ${email} from ${source || 'unknown'}`);

    return createSendToken(user, 200, 'Login successful');

  } catch (error) {
    return handleApiError(error);
  }
}
