import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';
import { AppError, handleApiError } from '@/lib/errors';
import { signToken } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await dbConnect();
    
    const body = await request.json();
    const { email, password, firstName, lastName } = body;

    // Validate required fields
    if (!email || !password || !firstName) {
      throw AppError.badRequest('Email, password, and first name are required');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw AppError.conflict('An account with this email already exists');
    }

    // Validate name lengths
    if (firstName.length > 50) {
      throw AppError.badRequest('First name is too long (max 50 characters)');
    }
    if (lastName && lastName.length > 50) {
      throw AppError.badRequest('Last name is too long (max 50 characters)');
    }

    // Create new user
    const newUser = await User.create({
      email: email.toLowerCase(),
      password,
      firstName: firstName.trim(),
      lastName: lastName?.trim() || '',
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

    // Log successful signup
    console.log(`✅ New user registered: ${email} (${firstName} ${lastName || ''})`);

    // Create JWT token for auto-login after signup
    const token = signToken(newUser);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: newUser._id.toString(),
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        fullName: newUser.fullName,
        apiKey: newUser.apiKey,
        status: newUser.status,
        role: newUser.role,
        credits: newUser.credits,
        hasActiveSubscription: newUser.hasActiveSubscription,
        preferences: newUser.preferences,
        createdAt: newUser.createdAt
      },
      token,
      timestamp: new Date().toISOString()
    }, { status: 201 });

  } catch (error) {
    return handleApiError(error);
  }
}

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}
