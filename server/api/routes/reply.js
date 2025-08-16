const express = require('express');
const fetch = require('node-fetch');
const User = require('../models/User');
const { AppError } = require('../utils/AppError');
const { catchAsync } = require('../middleware/errorHandler');
const { validateApiKey, handleFreeCredits, requireCredits } = require('../middleware/auth');

const router = express.Router();

/**
 * AI Reply Generation Routes for Quirkly API Server
 * Handles reply generation with credit management and rate limiting
 */

// @desc    Generate AI reply
// @route   POST /api/reply/generate
// @access  Public (with free credits) or Private (with API key)
router.post('/generate', handleFreeCredits, requireCredits(1), catchAsync(async (req, res, next) => {
  const { 
    tweetText, 
    tone = 'professional', 
    userContext,
    timestamp,
    source = 'unknown'
  } = req.body;

  // Validate required fields
  if (!tweetText || !tweetText.trim()) {
    return next(AppError.badRequest('Tweet text is required'));
  }

  if (tweetText.length > 2000) {
    return next(AppError.badRequest('Tweet text is too long (max 2000 characters)'));
  }

  // Validate tone
  const validTones = ['professional', 'casual', 'humorous', 'empathetic', 'analytical', 'enthusiastic'];
  if (!validTones.includes(tone)) {
    return next(AppError.badRequest(`Invalid tone. Must be one of: ${validTones.join(', ')}`));
  }

  try {
    // Prepare request to AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'https://ai.technioz.com/webhook/replyai-webhook';
    
    const aiRequestBody = {
      tweetText: tweetText.trim(),
      tone,
      userContext: userContext || {},
      timestamp: timestamp || new Date().toISOString(),
      source: source,
      userId: req.user ? req.user._id.toString() : null,
      isFreeUser: req.isFreeUser || false
    };

    console.log(`🤖 Generating AI reply for ${req.user ? req.user.email : 'free user'} - Tone: ${tone}`);

    // Make request to AI service
    const aiResponse = await fetch(aiServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Quirkly-API-Server/1.0.0'
      },
      body: JSON.stringify(aiRequestBody),
      timeout: 30000 // 30 second timeout
    });

    if (!aiResponse.ok) {
      console.error(`❌ AI service error: ${aiResponse.status} ${aiResponse.statusText}`);
      return next(AppError.externalServiceError('AI Service', `AI service returned ${aiResponse.status}`));
    }

    const aiResult = await aiResponse.json();

    if (!aiResult.success || !aiResult.reply) {
      console.error('❌ AI service returned invalid response:', aiResult);
      return next(AppError.aiServiceError('Failed to generate reply'));
    }

    // Use credits if user is authenticated
    if (req.user && !req.isFreeUser) {
      try {
        await req.user.useCredits(1);
        console.log(`✅ Credit used: ${req.user.email} (${req.user.credits.available} remaining)`);
      } catch (error) {
        if (error.message === 'Insufficient credits') {
          return next(AppError.creditsExhausted());
        }
        throw error;
      }
    }

    // Prepare response
    const response = {
      success: true,
      reply: aiResult.reply,
      tone: tone,
      metadata: {
        originalTweetLength: tweetText.length,
        replyLength: aiResult.reply.length,
        processingTime: aiResult.processingTime || null,
        source: source,
        timestamp: new Date().toISOString()
      }
    };

    // Add user-specific info if authenticated
    if (req.user) {
      response.user = {
        creditsRemaining: req.user.credits.available,
        hasActiveSubscription: req.user.hasActiveSubscription
      };
    } else if (req.isFreeUser) {
      // Add free user info
      const freeCreditsLimit = parseInt(process.env.FREE_CREDITS_LIMIT) || 50;
      response.freeUser = {
        creditsUsed: req.freeCreditsUsed,
        creditsRemaining: Math.max(0, freeCreditsLimit - req.freeCreditsUsed),
        dailyLimit: freeCreditsLimit,
        signupUrl: `${process.env.FRONTEND_URL}/signup`
      };
    }

    console.log(`✅ Reply generated successfully for ${req.user ? req.user.email : 'free user'}`);

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error generating reply:', error);

    // Handle specific error types
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return next(AppError.serviceUnavailable('AI service is currently unavailable'));
    }

    if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
      return next(AppError.serviceUnavailable('AI service request timed out'));
    }

    if (error.name === 'FetchError') {
      return next(AppError.externalServiceError('AI Service', 'Failed to connect to AI service'));
    }

    // Generic error
    return next(AppError.aiServiceError('Failed to generate reply'));
  }
}));

// @desc    Get reply history (for authenticated users)
// @route   GET /api/reply/history
// @access  Private
router.get('/history', validateApiKey, catchAsync(async (req, res, next) => {
  const { limit = 20, offset = 0, tone } = req.query;
  
  // Get user's usage history
  let usageHistory = req.user.usage
    .sort((a, b) => b.date - a.date)
    .slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  // Filter by tone if specified
  if (tone) {
    // Note: We don't store tone in usage history yet, but this is where you'd filter
    // This would require updating the User model to store more detailed reply history
  }

  const totalReplies = req.user.usage.reduce((total, day) => total + day.repliesGenerated, 0);

  res.status(200).json({
    success: true,
    history: usageHistory.map(usage => ({
      date: usage.date,
      creditsUsed: usage.creditsUsed,
      repliesGenerated: usage.repliesGenerated,
      month: usage.month,
      year: usage.year
    })),
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      total: req.user.usage.length,
      hasMore: parseInt(offset) + parseInt(limit) < req.user.usage.length
    },
    summary: {
      totalReplies,
      totalCreditsUsed: req.user.credits.used,
      accountAge: Math.ceil((new Date() - req.user.createdAt) / (1000 * 60 * 60 * 24))
    },
    timestamp: new Date().toISOString()
  });
}));

// @desc    Get available tones
// @route   GET /api/reply/tones
// @access  Public
router.get('/tones', catchAsync(async (req, res, next) => {
  const tones = [
    {
      id: 'professional',
      name: 'Professional',
      description: 'Formal, respectful, and business-appropriate tone',
      example: 'Thank you for sharing this insightful perspective.'
    },
    {
      id: 'casual',
      name: 'Casual',
      description: 'Relaxed, friendly, and conversational tone',
      example: 'Great point! I totally agree with this.'
    },
    {
      id: 'humorous',
      name: 'Humorous',
      description: 'Light-hearted, witty, and entertaining tone',
      example: 'This is so true it hurts! 😄'
    },
    {
      id: 'empathetic',
      name: 'Empathetic',
      description: 'Understanding, compassionate, and supportive tone',
      example: 'I can really relate to this. Thanks for sharing.'
    },
    {
      id: 'analytical',
      name: 'Analytical',
      description: 'Thoughtful, detailed, and data-driven tone',
      example: 'This raises several interesting points worth considering.'
    },
    {
      id: 'enthusiastic',
      name: 'Enthusiastic',
      description: 'Energetic, positive, and excited tone',
      example: 'This is absolutely fantastic! Love the energy!'
    }
  ];

  res.status(200).json({
    success: true,
    tones,
    defaultTone: 'professional',
    timestamp: new Date().toISOString()
  });
}));

// @desc    Health check for reply service
// @route   GET /api/reply/health
// @access  Public
router.get('/health', catchAsync(async (req, res, next) => {
  try {
    // Test connection to AI service
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'https://ai.technioz.com/webhook/replyai-webhook';
    
    const testResponse = await fetch(aiServiceUrl, {
      method: 'HEAD',
      timeout: 5000
    });

    const isAIServiceHealthy = testResponse.ok;

    res.status(200).json({
      success: true,
      service: 'Reply Generation Service',
      status: 'healthy',
      aiService: {
        url: aiServiceUrl,
        status: isAIServiceHealthy ? 'healthy' : 'unhealthy',
        responseTime: testResponse.headers.get('x-response-time') || 'unknown'
      },
      features: {
        freeCredits: true,
        authenticatedUsers: true,
        toneVariations: 6,
        maxTweetLength: 2000
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(200).json({
      success: true,
      service: 'Reply Generation Service',
      status: 'healthy',
      aiService: {
        status: 'unhealthy',
        error: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
}));

module.exports = router;
