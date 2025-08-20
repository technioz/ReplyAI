import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';
import { AppError, handleApiError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await dbConnect();
    
    const body = await request.json();
    const { email, password, fullName, action, timestamp, source } = body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw AppError.conflict('An account with this email already exists');
    }

    // Split fullName into firstName and lastName
    const nameParts = fullName.trim().split(/\s+/);
    let firstName, lastName;
    
    if (nameParts.length === 1) {
      // Only one name provided, use it as firstName
      firstName = nameParts[0];
      lastName = '';
    } else {
      // Multiple names provided, use first as firstName and rest as lastName
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
    }

    // Validate name lengths
    if (firstName.length > 50) {
      throw AppError.badRequest('First name is too long (max 50 characters)');
    }
    if (lastName.length > 50) {
      throw AppError.badRequest('Last name is too long (max 50 characters)');
    }

    // Create new user
    const newUser = await User.create({
      email,
      password,
      firstName,
      lastName,
      credits: {
        available: 50,
        used: 0,
        total: 50,
        lastResetAt: new Date()
      }
    });

    // Generate API key
    newUser.generateApiKey();
    await newUser.save();

    // Create session token for dashboard
    const userAgent = request.headers.get('User-Agent') || 'unknown';
    const ipAddress = request.ip || 'unknown';
    const sessionToken = newUser.createSessionToken(userAgent, ipAddress);
    await newUser.save();

    // Log successful signup
    console.log(`✅ New user registered: ${email} (${firstName} ${lastName}) from ${source || 'unknown'}`);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        fullName: newUser.fullName,
        apiKey: newUser.apiKey,
        status: newUser.status,
        credits: newUser.credits,
        hasActiveSubscription: newUser.hasActiveSubscription,
        preferences: newUser.preferences,
        createdAt: newUser.createdAt
      },
      sessionToken,
      timestamp: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    return handleApiError(error);
  }
}
