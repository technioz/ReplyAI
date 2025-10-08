import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';
import dbConnect from '@/lib/database';
import User from '@/lib/models/User';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancellation(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    return handleApiError(error);
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const status = subscription.status;
  
  // Find user by Stripe customer ID
  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) return;

  // Update user subscription status
  await User.findByIdAndUpdate(user.id, {
    hasActiveSubscription: status === 'active',
    subscriptionStatus: status,
    subscriptionId: subscription.id,
  });
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  
  // Find user by Stripe customer ID
  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) return;

  // Update user subscription status
  await User.findByIdAndUpdate(user.id, {
    hasActiveSubscription: false,
    subscriptionStatus: 'canceled',
  });
}

async function handlePaymentSuccess(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  // Find user by Stripe customer ID
  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) return;

  // Handle successful payment (e.g., add credits, update billing history)
  // This depends on your business logic
}

async function handlePaymentFailure(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  
  // Find user by Stripe customer ID
  const user = await User.findOne({ stripeCustomerId: customerId });
  if (!user) return;

  // Handle payment failure (e.g., send notification, update status)
  // This depends on your business logic
}
