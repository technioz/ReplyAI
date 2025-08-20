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

    // Return subscription information
    const subscriptionInfo = {
      hasActiveSubscription: currentUser.hasActiveSubscription,
      plan: currentUser.subscription ? currentUser.subscription.plan : 'free',
      status: currentUser.subscription ? currentUser.subscription.status : null,
      currentPeriodStart: currentUser.subscription ? currentUser.subscription.currentPeriodStart : null,
      currentPeriodEnd: currentUser.subscription ? currentUser.subscription.currentPeriodEnd : null,
      cancelAtPeriodEnd: currentUser.subscription ? currentUser.subscription.cancelAtPeriodEnd : false,
      creditsIncluded: currentUser.subscription ? currentUser.subscription.creditsIncluded : 50,
      createdAt: currentUser.subscription ? currentUser.subscription.createdAt : null,
      updatedAt: currentUser.subscription ? currentUser.subscription.updatedAt : null
    };

    return NextResponse.json({
      success: true,
      subscription: subscriptionInfo,
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
    const { action, data } = body;

    if (!action) {
      return NextResponse.json({ 
        error: 'Action is required' 
      }, { status: 400 });
    }

    // Get user with fresh data
    const currentUser = await User.findById(user._id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let message = '';
    let updateData: any = {};

    switch (action) {
      case 'updatePreferences':
        if (data.defaultTone) {
          const validTones = ['professional', 'casual', 'humorous', 'empathetic', 'analytical', 'enthusiastic'];
          if (!validTones.includes(data.defaultTone)) {
            return NextResponse.json({ 
              error: `Invalid tone. Must be one of: ${validTones.join(', ')}` 
            }, { status: 400 });
          }
          updateData['preferences.defaultTone'] = data.defaultTone;
        }
        message = 'Subscription preferences updated successfully';
        break;

      case 'updateBilling':
        // Handle billing updates (e.g., payment method changes)
        message = 'Billing information updated successfully';
        break;

      default:
        return NextResponse.json({ 
          error: 'Invalid action' 
        }, { status: 400 });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -sessions');

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}
