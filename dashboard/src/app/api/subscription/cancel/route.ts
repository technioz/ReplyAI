import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (!user.hasActiveSubscription) {
      return NextResponse.json({ 
        success: false, 
        error: 'BAD_REQUEST',
        message: 'No active subscription to cancel' 
      }, { status: 400 });
    }

    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2023-10-16'
      });

      // Cancel subscription at period end
      const canceledSubscription = await stripe.subscriptions.update(
        user.subscription!.stripeSubscriptionId,
        {
          cancel_at_period_end: true
        }
      );

      // Update local subscription data
      if (user.subscription) {
        user.subscription.cancelAtPeriodEnd = true;
        user.subscription.updatedAt = new Date();
        await user.save();
      }

      console.log(`❌ Subscription canceled: ${user.email} - will end on ${new Date(canceledSubscription.current_period_end * 1000)}`);

      return NextResponse.json({
        success: true,
        message: 'Subscription will be canceled at the end of the current billing period',
        subscription: {
          id: canceledSubscription.id,
          status: canceledSubscription.status,
          cancelAtPeriodEnd: true,
          currentPeriodEnd: new Date(canceledSubscription.current_period_end * 1000)
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error canceling subscription:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'EXTERNAL_SERVICE_ERROR',
        message: 'Failed to cancel subscription' 
      }, { status: 502 });
    }

  } catch (error) {
    return handleApiError(error);
  }
}
