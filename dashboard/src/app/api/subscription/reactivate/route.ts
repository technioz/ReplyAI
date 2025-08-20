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

    if (!user.subscription || !user.subscription.cancelAtPeriodEnd) {
      return NextResponse.json({ 
        success: false, 
        error: 'BAD_REQUEST',
        message: 'No canceled subscription to reactivate' 
      }, { status: 400 });
    }

    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2023-10-16'
      });

      // Reactivate subscription
      const reactivatedSubscription = await stripe.subscriptions.update(
        user.subscription.stripeSubscriptionId,
        {
          cancel_at_period_end: false
        }
      );

      // Update local subscription data
      user.subscription.cancelAtPeriodEnd = false;
      user.subscription.updatedAt = new Date();
      await user.save();

      console.log(`✅ Subscription reactivated: ${user.email}`);

      return NextResponse.json({
        success: true,
        message: 'Subscription reactivated successfully',
        subscription: {
          id: reactivatedSubscription.id,
          status: reactivatedSubscription.status,
          cancelAtPeriodEnd: false,
          currentPeriodEnd: new Date(reactivatedSubscription.current_period_end * 1000)
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error reactivating subscription:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'EXTERNAL_SERVICE_ERROR',
        message: 'Failed to reactivate subscription' 
      }, { status: 502 });
    }

  } catch (error) {
    return handleApiError(error);
  }
}
