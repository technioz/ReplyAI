const express = require('express');
const Stripe = require('stripe');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { AppError } = require('../utils/AppError');
const { catchAsync } = require('../middleware/errorHandler');
const { authenticateUser, restrictTo } = require('../middleware/auth');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Subscription Management Routes for Quirkly API Server
 * Handles Stripe integration, subscription management, and billing
 */

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

// @desc    Get available subscription plans
// @route   GET /api/subscription/plans
// @access  Public
router.get('/plans', catchAsync(async (req, res, next) => {
  res.status(200).json({
    success: true,
    plans: Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
      id: key,
      ...plan
    })),
    currency: 'USD',
    billingCycle: 'monthly',
    timestamp: new Date().toISOString()
  });
}));

// @desc    Create Stripe customer and setup intent
// @route   POST /api/subscription/setup
// @access  Private
router.post('/setup', authenticateUser, catchAsync(async (req, res, next) => {
  let stripeCustomer;

  // Check if user already has a Stripe customer ID
  if (req.user.stripeCustomerId) {
    try {
      stripeCustomer = await stripe.customers.retrieve(req.user.stripeCustomerId);
    } catch (error) {
      // Customer doesn't exist, create a new one
      stripeCustomer = null;
    }
  }

  // Create new customer if needed
  if (!stripeCustomer) {
    stripeCustomer = await stripe.customers.create({
      email: req.user.email,
      name: req.user.fullName,
      metadata: {
        userId: req.user._id.toString(),
        environment: process.env.NODE_ENV
      }
    });

    // Save customer ID to user
    req.user.stripeCustomerId = stripeCustomer.id;
    await req.user.save();
  }

  // Create setup intent for future payments
  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomer.id,
    payment_method_types: ['card'],
    usage: 'off_session'
  });

  res.status(200).json({
    success: true,
    message: 'Payment setup initialized',
    setupIntent: {
      id: setupIntent.id,
      clientSecret: setupIntent.client_secret
    },
    customer: {
      id: stripeCustomer.id,
      email: stripeCustomer.email,
      name: stripeCustomer.name
    },
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    timestamp: new Date().toISOString()
  });
}));

// @desc    Create subscription
// @route   POST /api/subscription/create
// @access  Private
router.post('/create', [
  body('planId')
    .isIn(['basic', 'pro', 'enterprise'])
    .withMessage('Invalid plan ID'),
  body('paymentMethodId')
    .notEmpty()
    .withMessage('Payment method is required')
], authenticateUser, catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(AppError.validationError('Validation failed', errorMessages));
  }

  const { planId, paymentMethodId } = req.body;
  const plan = SUBSCRIPTION_PLANS[planId];

  if (!plan.stripePriceId) {
    return next(AppError.badRequest('Plan configuration error'));
  }

  // Check if user already has active subscription
  if (req.user.hasActiveSubscription) {
    return next(AppError.conflict('User already has an active subscription'));
  }

  // Ensure user has Stripe customer ID
  if (!req.user.stripeCustomerId) {
    return next(AppError.badRequest('Payment setup required. Please call /setup first.'));
  }

  try {
    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: req.user.stripeCustomerId,
    });

    // Set as default payment method
    await stripe.customers.update(req.user.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: req.user.stripeCustomerId,
      items: [{ price: plan.stripePriceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: req.user._id.toString(),
        planId: planId
      }
    });

    // Update user subscription info
    req.user.subscription = {
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
    req.user.credits = {
      available: plan.credits,
      used: 0,
      total: plan.credits,
      lastResetAt: new Date()
    };

    await req.user.save();

    console.log(`💳 New subscription created: ${req.user.email} - ${planId} plan`);

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: planId,
        planName: plan.name,
        creditsIncluded: plan.credits,
        currentPeriodStart: req.user.subscription.currentPeriodStart,
        currentPeriodEnd: req.user.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: req.user.subscription.cancelAtPeriodEnd
      },
      credits: req.user.credits,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Stripe subscription creation error:', error);
    
    if (error.type === 'StripeCardError') {
      return next(AppError.paymentError(error.message));
    }
    
    return next(AppError.paymentError('Failed to create subscription'));
  }
}));

// @desc    Get current subscription
// @route   GET /api/subscription/current
// @access  Private
router.get('/current', authenticateUser, catchAsync(async (req, res, next) => {
  if (!req.user.hasActiveSubscription) {
    return res.status(200).json({
      success: true,
      subscription: null,
      plan: 'free',
      credits: req.user.credits,
      message: 'No active subscription',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // Get latest subscription data from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      req.user.subscription.stripeSubscriptionId
    );

    // Update local subscription data
    req.user.subscription.status = stripeSubscription.status;
    req.user.subscription.currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    req.user.subscription.currentPeriodEnd = new Date(stripeSubscription.current_period_end * 1000);
    req.user.subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
    req.user.subscription.updatedAt = new Date();
    
    await req.user.save();

    const plan = SUBSCRIPTION_PLANS[req.user.subscription.plan];

    res.status(200).json({
      success: true,
      subscription: {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        plan: req.user.subscription.plan,
        planName: plan.name,
        creditsIncluded: plan.credits,
        currentPeriodStart: req.user.subscription.currentPeriodStart,
        currentPeriodEnd: req.user.subscription.currentPeriodEnd,
        cancelAtPeriodEnd: req.user.subscription.cancelAtPeriodEnd,
        createdAt: req.user.subscription.createdAt
      },
      credits: req.user.credits,
      nextBillingDate: req.user.subscription.currentPeriodEnd,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    return next(AppError.externalServiceError('Stripe', 'Failed to fetch subscription details'));
  }
}));

// @desc    Cancel subscription
// @route   POST /api/subscription/cancel
// @access  Private
router.post('/cancel', authenticateUser, catchAsync(async (req, res, next) => {
  if (!req.user.hasActiveSubscription) {
    return next(AppError.badRequest('No active subscription to cancel'));
  }

  try {
    // Cancel subscription at period end
    const canceledSubscription = await stripe.subscriptions.update(
      req.user.subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: true
      }
    );

    // Update local subscription data
    req.user.subscription.cancelAtPeriodEnd = true;
    req.user.subscription.updatedAt = new Date();
    await req.user.save();

    console.log(`❌ Subscription canceled: ${req.user.email} - will end on ${new Date(canceledSubscription.current_period_end * 1000)}`);

    res.status(200).json({
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
    return next(AppError.externalServiceError('Stripe', 'Failed to cancel subscription'));
  }
}));

// @desc    Reactivate canceled subscription
// @route   POST /api/subscription/reactivate
// @access  Private
router.post('/reactivate', authenticateUser, catchAsync(async (req, res, next) => {
  if (!req.user.subscription || !req.user.subscription.cancelAtPeriodEnd) {
    return next(AppError.badRequest('No canceled subscription to reactivate'));
  }

  try {
    // Reactivate subscription
    const reactivatedSubscription = await stripe.subscriptions.update(
      req.user.subscription.stripeSubscriptionId,
      {
        cancel_at_period_end: false
      }
    );

    // Update local subscription data
    req.user.subscription.cancelAtPeriodEnd = false;
    req.user.subscription.updatedAt = new Date();
    await req.user.save();

    console.log(`✅ Subscription reactivated: ${req.user.email}`);

    res.status(200).json({
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
    return next(AppError.externalServiceError('Stripe', 'Failed to reactivate subscription'));
  }
}));

// @desc    Get billing history
// @route   GET /api/subscription/billing
// @access  Private
router.get('/billing', authenticateUser, catchAsync(async (req, res, next) => {
  if (!req.user.stripeCustomerId) {
    return res.status(200).json({
      success: true,
      invoices: [],
      message: 'No billing history available',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const invoices = await stripe.invoices.list({
      customer: req.user.stripeCustomerId,
      limit: 20
    });

    const billingHistory = invoices.data.map(invoice => ({
      id: invoice.id,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency.toUpperCase(),
      status: invoice.status,
      date: new Date(invoice.created * 1000),
      description: invoice.lines.data[0]?.description || 'Subscription',
      downloadUrl: invoice.hosted_invoice_url,
      pdfUrl: invoice.invoice_pdf
    }));

    res.status(200).json({
      success: true,
      invoices: billingHistory,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching billing history:', error);
    return next(AppError.externalServiceError('Stripe', 'Failed to fetch billing history'));
  }
}));

// @desc    Webhook handler for Stripe events
// @route   POST /api/subscription/webhook
// @access  Public (but verified by Stripe signature)
router.post('/webhook', express.raw({ type: 'application/json' }), catchAsync(async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(400).send('Webhook secret not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`🎣 Stripe webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}));

// Webhook helper functions
async function handleSubscriptionUpdate(subscription) {
  const user = await User.findOne({ stripeCustomerId: subscription.customer });
  if (!user) return;

  const planId = subscription.metadata.planId || 'basic';
  const plan = SUBSCRIPTION_PLANS[planId];

  user.subscription = {
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0].price.id,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    plan: planId,
    creditsIncluded: plan.credits,
    createdAt: user.subscription?.createdAt || new Date(),
    updatedAt: new Date()
  };

  await user.save();
  console.log(`✅ Subscription updated via webhook: ${user.email}`);
}

async function handleSubscriptionDeleted(subscription) {
  const user = await User.findOne({ stripeCustomerId: subscription.customer });
  if (!user) return;

  // Reset to free plan
  user.subscription = undefined;
  user.credits = {
    available: 50,
    used: 0,
    total: 50,
    lastResetAt: new Date()
  };

  await user.save();
  console.log(`❌ Subscription deleted via webhook: ${user.email}`);
}

async function handlePaymentSucceeded(invoice) {
  const user = await User.findOne({ stripeCustomerId: invoice.customer });
  if (!user || !user.subscription) return;

  // Reset credits on successful payment (monthly renewal)
  const plan = SUBSCRIPTION_PLANS[user.subscription.plan];
  if (plan) {
    user.credits = {
      available: plan.credits,
      used: 0,
      total: plan.credits,
      lastResetAt: new Date()
    };
    
    await user.save();
    console.log(`💰 Payment succeeded, credits reset: ${user.email}`);
  }
}

async function handlePaymentFailed(invoice) {
  const user = await User.findOne({ stripeCustomerId: invoice.customer });
  if (!user) return;

  // You might want to:
  // 1. Send notification email
  // 2. Update subscription status
  // 3. Implement grace period logic

  console.log(`💸 Payment failed for user: ${user.email}`);
}

module.exports = router;
