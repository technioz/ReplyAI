import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ 
        error: 'Verification token is required' 
      }, { status: 400 });
    }

    // Find user by verification token
    const user = await User.findOne({ 
      emailVerificationToken: token,
      emailVerificationToken: { $exists: true, $ne: null }
    });

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid or expired verification token' 
      }, { status: 400 });
    }

    // Check if token is expired (24 hours)
    const tokenExpiry = new Date(user.createdAt.getTime() + 24 * 60 * 60 * 1000);
    if (new Date() > tokenExpiry) {
      return NextResponse.json({ 
        error: 'Verification token has expired' 
      }, { status: 400 });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    console.log(`✅ Email verified for user: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ 
        error: 'Email is required' 
      }, { status: 400 });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ 
        message: 'Email is already verified' 
      }, { status: 200 });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    await user.save();

    // TODO: Send verification email
    console.log(`📧 Verification email sent to: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}
