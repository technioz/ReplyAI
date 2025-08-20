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
    const currentUser = await User.findById(user._id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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
    });

  } catch (error) {
    return handleApiError(error);
  }
}
