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
    const currentUser = await User.findById(user._id).select('-password -sessions').exec();
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      preferences: currentUser.preferences || {
        defaultTone: 'professional',
        notifications: {
          email: true,
          marketing: false
        }
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
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user has legacy 'empathic' value and migrate it
    if (user.preferences?.defaultTone === 'empathic') {
      await User.findByIdAndUpdate(user._id, {
        'preferences.defaultTone': 'empathetic'
      });
    }

    const body = await request.json();
    const { defaultTone, notifications } = body;
    const updates: any = {};

    if (defaultTone !== undefined) {
      // Handle legacy 'empathic' value by converting to 'empathetic'
      if (defaultTone === 'empathic') {
        updates['preferences.defaultTone'] = 'empathetic';
      } else {
        // Validate tone
        const validTones = ['professional', 'casual', 'humorous', 'empathetic', 'analytical', 'enthusiastic', 'controversial'];
        if (!validTones.includes(defaultTone)) {
          return NextResponse.json({ 
            success: false, 
            error: 'VALIDATION_ERROR',
            message: `Invalid default tone. Must be one of: ${validTones.join(', ')}` 
          }, { status: 400 });
        }
        updates['preferences.defaultTone'] = defaultTone;
      }
    }

    if (notifications) {
      if (notifications.email !== undefined) {
        if (typeof notifications.email !== 'boolean') {
          return NextResponse.json({ 
            success: false, 
            error: 'VALIDATION_ERROR',
            message: 'Email notifications must be boolean' 
          }, { status: 400 });
        }
        updates['preferences.notifications.email'] = notifications.email;
      }
      if (notifications.marketing !== undefined) {
        if (typeof notifications.marketing !== 'boolean') {
          return NextResponse.json({ 
            success: false, 
            error: 'VALIDATION_ERROR',
            message: 'Marketing notifications must be boolean' 
          }, { status: 400 });
        }
        updates['preferences.notifications.marketing'] = notifications.marketing;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -sessions').exec();

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: updatedUser.preferences,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}
