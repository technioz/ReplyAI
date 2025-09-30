import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/middleware/auth';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user with fresh data
    const currentUser = await User.findById(user.id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check for local subscription first (for admin users or non-Stripe subscriptions)
    if (currentUser.subscription && currentUser.subscription.status === 'active') {
      const localSubscription = {
        id: currentUser.subscription.stripeSubscriptionId,
        status: currentUser.subscription.status,
        plan: currentUser.subscription.plan,
        planName: currentUser.subscription.plan.charAt(0).toUpperCase() + currentUser.subscription.plan.slice(1) + ' Plan',
        creditsIncluded: currentUser.subscription.creditsIncluded,
        currentPeriodStart: currentUser.subscription.currentPeriodStart,
        currentPeriodEnd: currentUser.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: currentUser.subscription.cancelAtPeriodEnd,
        createdAt: currentUser.subscription.createdAt,
        // Add plan details
        price: currentUser.subscription.plan === 'basic' ? 9.99 : 
               currentUser.subscription.plan === 'pro' ? 24.99 : 99.99,
        features: currentUser.subscription.plan === 'basic' ? [
          '1,000 AI replies per month',
          'All tone variations',
          'Email support'
        ] : currentUser.subscription.plan === 'pro' ? [
          '5,000 AI replies per month',
          'All tone variations',
          'Priority support',
          'Advanced analytics'
        ] : [
          '20,000 AI replies per month',
          'All tone variations',
          '24/7 support',
          'Advanced analytics',
          'Custom integrations'
        ]
      };

      return NextResponse.json({
        hasActiveSubscription: true,
        subscription: localSubscription,
        customer: null,
        isLocalSubscription: true
      });
    }

    // If no local subscription, check Stripe subscription
    if (!currentUser.stripeCustomerId) {
      return NextResponse.json({
        hasActiveSubscription: false,
        subscription: null,
        customer: null,
      });
    }

    // Get Stripe customer and subscriptions
    const customer = await stripe.customers.retrieve(currentUser.stripeCustomerId);
    const subscriptions = await stripe.subscriptions.list({
      customer: currentUser.stripeCustomerId,
      status: 'active',
      expand: ['data.default_payment_method'],
    });

    const activeSubscription = subscriptions.data[0] || null;

    return NextResponse.json({
      hasActiveSubscription: !!activeSubscription,
      subscription: activeSubscription,
      customer,
      isLocalSubscription: false
    });

  } catch (error) {
    return handleApiError(error);
  }
}
