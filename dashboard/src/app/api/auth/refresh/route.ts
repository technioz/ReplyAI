import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json({ 
        error: 'Refresh token is required' 
      }, { status: 400 });
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
      
      // Find user by ID
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        return NextResponse.json({ 
          error: 'User not found' 
        }, { status: 404 });
      }

      // Check if user is active
      if (user.status !== 'active') {
        return NextResponse.json({ 
          error: 'User account is not active' 
        }, { status: 403 });
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET!,
        { expiresIn: '15m' }
      );

      // Generate new refresh token
      const newRefreshToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );

      console.log(`🔄 Token refreshed for user: ${user.email}`);

      return NextResponse.json({
        success: true,
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          status: user.status
        },
        timestamp: new Date().toISOString()
      });

    } catch (jwtError) {
      return NextResponse.json({ 
        error: 'Invalid or expired refresh token' 
      }, { status: 401 });
    }

  } catch (error) {
    return handleApiError(error);
  }
}
