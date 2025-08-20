import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user with fresh data
    const currentUser = await User.findById(user._id).select('-password -sessions');
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get notification preferences
    const notifications = currentUser.preferences?.notifications || {
      email: true,
      marketing: false
    };

    return NextResponse.json({
      success: true,
      notifications,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { email, marketing } = body;

    // Validate input
    if (email !== undefined && typeof email !== 'boolean') {
      return NextResponse.json({ 
        error: 'Email notifications must be boolean' 
      }, { status: 400 });
    }

    if (marketing !== undefined && typeof marketing !== 'boolean') {
      return NextResponse.json({ 
        error: 'Marketing notifications must be boolean' 
      }, { status: 400 });
    }

    // Build update object
    const updates: any = {};
    
    if (email !== undefined) {
      updates['preferences.notifications.email'] = email;
    }
    
    if (marketing !== undefined) {
      updates['preferences.notifications.marketing'] = marketing;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -sessions');

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully',
      notifications: updatedUser.preferences?.notifications,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}
