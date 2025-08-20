import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    // Subscription plans configuration
    const SUBSCRIPTION_PLANS = {
      basic: {
        name: 'Basic Plan',
        credits: 1000,
        price: 9.99,
        stripePriceId: process.env.STRIPE_BASIC_PRICE_ID,
        features: ['1,000 AI replies per month', 'All tone variations', 'Email support']
      },
      pro: {
        name: 'Pro Plan',
        credits: 5000,
        price: 24.99,
        stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
        features: ['5,000 AI replies per month', 'All tone variations', 'Priority support', 'Advanced analytics']
      },
      enterprise: {
        name: 'Enterprise Plan',
        credits: 20000,
        price: 99.99,
        stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
        features: ['20,000 AI replies per month', 'All tone variations', '24/7 support', 'Advanced analytics', 'Custom integrations']
      }
    };

    return NextResponse.json({
      success: true,
      plans: Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
        id: key,
        ...plan
      })),
      currency: 'USD',
      billingCycle: 'monthly',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return handleApiError(error);
  }
}
