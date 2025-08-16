const express = require('express');
const User = require('../models/User');
const { AppError } = require('../utils/AppError');
const { catchAsync } = require('../middleware/errorHandler');
const { validateApiKey, protect, validateSession, authenticateUser } = require('../middleware/auth');

const router = express.Router();

/**
 * Credits Management Routes for Quirkly API Server
 * Handles credit tracking, usage, and statistics
 */



// @desc    Get user credits info
// @route   GET /api/credits
// @access  Private (API Key or JWT)
router.get('/', authenticateUser, catchAsync(async (req, res, next) => {
  const user = req.user;

  // Get current month usage
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const monthlyUsage = user.usage.filter(u => u.month === currentMonth);
  const monthlyCreditsUsed = monthlyUsage.reduce((total, day) => total + day.creditsUsed, 0);
  const monthlyRepliesGenerated = monthlyUsage.reduce((total, day) => total + day.repliesGenerated, 0);

  // Get today's usage
  const today = new Date().toDateString();
  const todayUsage = user.usage.find(u => u.date.toDateString() === today);
  
  res.status(200).json({
    success: true,
    credits: {
      available: user.credits.available,
      used: user.credits.used,
      total: user.credits.total,
      lastResetAt: user.credits.lastResetAt
    },
    usage: {
      today: {
        creditsUsed: todayUsage ? todayUsage.creditsUsed : 0,
        repliesGenerated: todayUsage ? todayUsage.repliesGenerated : 0
      },
      thisMonth: {
        creditsUsed: monthlyCreditsUsed,
        repliesGenerated: monthlyRepliesGenerated,
        daysActive: monthlyUsage.length
      }
    },
    subscription: {
      hasActive: user.hasActiveSubscription,
      plan: user.subscription ? user.subscription.plan : 'free',
      creditsIncluded: user.subscription ? user.subscription.creditsIncluded : 50
    },
    timestamp: new Date().toISOString()
  });
}));

// @desc    Get detailed usage statistics
// @route   GET /api/credits/stats
// @access  Private (API Key or JWT)
router.get('/stats', authenticateUser, catchAsync(async (req, res, next) => {
  const user = req.user;

  const { period = 'month', limit = 30 } = req.query;
  
  let usageData = [];
  const now = new Date();
  
  if (period === 'day') {
    // Get daily usage for the last N days
    for (let i = parseInt(limit) - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const dayUsage = user.usage.find(u => 
        u.date.toDateString() === date.toDateString()
      );
      
      usageData.push({
        date: date.toISOString().split('T')[0],
        creditsUsed: dayUsage ? dayUsage.creditsUsed : 0,
        repliesGenerated: dayUsage ? dayUsage.repliesGenerated : 0
      });
    }
  } else if (period === 'month') {
    // Get monthly usage for the last N months
    for (let i = parseInt(limit) - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthUsage = user.usage.filter(u => u.month === monthKey);
      const creditsUsed = monthUsage.reduce((total, day) => total + day.creditsUsed, 0);
      const repliesGenerated = monthUsage.reduce((total, day) => total + day.repliesGenerated, 0);
      
      usageData.push({
        month: monthKey,
        date: date.toISOString().split('T')[0],
        creditsUsed,
        repliesGenerated,
        daysActive: monthUsage.length
      });
    }
  }

  // Calculate totals
  const totalCreditsUsed = user.usage.reduce((total, day) => total + day.creditsUsed, 0);
  const totalRepliesGenerated = user.usage.reduce((total, day) => total + day.repliesGenerated, 0);
  const accountAge = Math.ceil((now - user.createdAt) / (1000 * 60 * 60 * 24));

  res.status(200).json({
    success: true,
    stats: {
      period,
      data: usageData,
      totals: {
        creditsUsed: totalCreditsUsed,
        repliesGenerated: totalRepliesGenerated,
        accountAgeDays: accountAge,
        averageCreditsPerDay: accountAge > 0 ? Math.round(totalCreditsUsed / accountAge * 100) / 100 : 0
      },
      current: {
        available: user.credits.available,
        used: user.credits.used,
        total: user.credits.total,
        utilizationRate: user.credits.total > 0 ? Math.round((user.credits.used / user.credits.total) * 100) : 0
      }
    },
    timestamp: new Date().toISOString()
  });
}));

// @desc    Use credits (internal endpoint for reply generation)
// @route   POST /api/credits/use
// @access  Private (API Key only)
router.post('/use', validateApiKey, catchAsync(async (req, res, next) => {
  const { amount = 1 } = req.body;
  
  if (amount <= 0 || amount > 10) {
    return next(AppError.badRequest('Credit amount must be between 1 and 10'));
  }

  try {
    await req.user.useCredits(amount);
    
    res.status(200).json({
      success: true,
      message: `${amount} credit${amount > 1 ? 's' : ''} used successfully`,
      credits: {
        available: req.user.credits.available,
        used: req.user.credits.used,
        total: req.user.credits.total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    if (error.message === 'Insufficient credits') {
      return next(AppError.creditsExhausted());
    }
    throw error;
  }
}));

// @desc    Reset credits (admin only or monthly reset)
// @route   POST /api/credits/reset
// @access  Private (Admin only)
router.post('/reset', authenticateUser, catchAsync(async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(AppError.forbidden('Admin access required'));
  }

  const { userId } = req.body;
  
  let targetUser = req.user;
  if (userId) {
    targetUser = await User.findById(userId);
    if (!targetUser) {
      return next(AppError.notFound('User not found'));
    }
  }

  await targetUser.resetCredits();

  res.status(200).json({
    success: true,
    message: 'Credits reset successfully',
    user: {
      id: targetUser._id,
      email: targetUser.email,
      credits: targetUser.credits
    },
    timestamp: new Date().toISOString()
  });
}));

// @desc    Get free credits info (for unauthenticated users)
// @route   GET /api/credits/free
// @access  Public
router.get('/free', catchAsync(async (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  const freeCreditsLimit = parseInt(process.env.FREE_CREDITS_LIMIT) || 50;
  
  // Get current usage from in-memory cache
  const today = new Date().toDateString();
  const key = `${clientIP}_${today}`;
  const currentUsage = (global.freeCreditsUsage && global.freeCreditsUsage.get(key)) || 0;
  
  res.status(200).json({
    success: true,
    freeCredits: {
      limit: freeCreditsLimit,
      used: currentUsage,
      available: Math.max(0, freeCreditsLimit - currentUsage),
      resetsAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
    },
    message: currentUsage >= freeCreditsLimit ? 
      'Free credits exhausted. Please sign up to continue.' : 
      `You have ${freeCreditsLimit - currentUsage} free credits remaining today.`,
    signupUrl: `${process.env.FRONTEND_URL}/signup`,
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;
