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

    const body = await request.json();
    const { planId, paymentMethodId } = body;

    // Validate plan ID
    const validPlanIds = ['basic', 'pro', 'enterprise'];
    if (!validPlanIds.includes(planId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'VALIDATION_ERROR',
        message: 'Invalid plan ID' 
      }, { status: 400 });
    }

    if (!paymentMethodId) {
      return NextResponse.json({ 
        success: false, 
        error: 'VALIDATION_ERROR',
        message: 'Payment method is required' 
      }, { status: 400 });
    }

    // Check if user already has active subscription
    if (user.hasActiveSubscription) {
      return NextResponse.json({ 
        success: false, 
        error: 'CONFLICT',
        message: 'User already has an active subscription' 
      }, { status: 409 });
    }

    // Ensure user has Stripe customer ID
    if (!user.stripeCustomerId) {
      return NextResponse.json({ 
        success: false, 
        error: 'BAD_REQUEST',
        message: 'Payment setup required. Please call /setup first.' 
      }, { status: 400 });
    }

    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
        apiVersion: '2023-10-16'
      });

      // Get plan configuration
      const SUBSCRIPTION_PLANS = {
        basic: {
          name: 'Basic Plan',
          credits: 1000,
          price: 9.99,
          stripePriceId: process.env.STRIPE_BASIC_PRICE_ID
        },
        pro: {
          name: 'Pro Plan',
          credits: 5000,
          price: 24.99,
          stripePriceId: process.env.STRIPE_PRO_PRICE_ID
        },
        enterprise: {
          name: 'Enterprise Plan',
          credits: 20000,
          price: 99.99,
          stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID
        }
      };

      const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
      if (!plan.stripePriceId) {
        return NextResponse.json({ 
          success: false, 
          error: 'BAD_REQUEST',
          message: 'Plan configuration error' 
        }, { status: 400 });
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.stripeCustomerId,
      });

      // Set as default payment method
      await stripe.customers.update(user.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: plan.stripePriceId }],
        default_payment_method: paymentMethodId,
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: user._id.toString(),
          planId: planId
        }
      });

      // Update user subscription info
      user.subscription = {
        stripeSubscriptionId: subscription.id,
        stripePriceId: plan.stripePriceId,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        plan: planId,
        creditsIncluded: plan.credits,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Reset credits to plan amount
      user.credits = {
        available: plan.credits,
        used: 0,
        total: plan.credits,
        lastResetAt: new Date()
      };

      await user.save();

      console.log(`💳 New subscription created: ${user.email} - ${planId} plan`);

      return NextResponse.json({
        success: true,
        message: 'Subscription created successfully',
        subscription: {
          id: subscription.id,
          status: subscription.status,
          plan: planId,
          planName: plan.name,
          creditsIncluded: plan.credits,
          currentPeriodStart: user.subscription.currentPeriodStart,
          currentPeriodEnd: user.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd
        },
        credits: user.credits,
        timestamp: new Date().toISOString()
      }, { status: 201 });

    } catch (error) {
      console.error('Stripe subscription creation error:', error);
      
      if (error instanceof Error && error.message.includes('card')) {
        return NextResponse.json({ 
          success: false, 
          error: 'PAYMENT_ERROR',
          message: error.message 
        }, { status: 402 });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'PAYMENT_ERROR',
        message: 'Failed to create subscription' 
      }, { status: 400 });
    }

  } catch (error) {
    return handleApiError(error);
  }
}
