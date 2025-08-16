const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const { AppError } = require('../utils/AppError');
const { catchAsync } = require('./errorHandler');

/**
 * Authentication middleware for Quirkly API Server
 * Handles JWT tokens, API keys, and session validation
 */

// Protect routes with JWT authentication
const protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(AppError.unauthorized('You are not logged in! Please log in to get access.', 'NOT_LOGGED_IN'));
  }

  // 2) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET || 'secret');

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id).select('+password');
  if (!currentUser) {
    return next(AppError.unauthorized('The user belonging to this token does no longer exist.', 'USER_NOT_FOUND'));
  }

  // 4) Check if user is active
  if (currentUser.status !== 'active') {
    return next(AppError.forbidden('Your account is inactive. Please contact support.', 'ACCOUNT_INACTIVE'));
  }

  // 5) Check if user account is locked
  if (currentUser.isLocked) {
    return next(AppError.forbidden('Your account is temporarily locked due to too many failed login attempts.', 'ACCOUNT_LOCKED'));
  }

  // Grant access to protected route
  req.user = currentUser;
  next();
});

// Validate API key for extension requests
const validateApiKey = catchAsync(async (req, res, next) => {
  // 1) Getting API key from header or body
  let apiKey;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    apiKey = req.headers.authorization.split(' ')[1];
  } else if (req.body.apiKey) {
    apiKey = req.body.apiKey;
  } else if (req.query.apiKey) {
    apiKey = req.query.apiKey;
  }

  if (!apiKey) {
    return next(AppError.unauthorized('API key is required', 'API_KEY_REQUIRED'));
  }

  // 2) Validate API key format
  if (!apiKey.startsWith('qk_')) {
    return next(AppError.unauthorized('Invalid API key format', 'INVALID_API_KEY_FORMAT'));
  }

  // 3) Find user by API key
  const user = await User.findByApiKey(apiKey);
  if (!user) {
    return next(AppError.unauthorized('Invalid API key', 'INVALID_API_KEY'));
  }

  // 4) Check if user is active
  if (user.status !== 'active') {
    return next(AppError.forbidden('Your account is inactive. Please contact support.', 'ACCOUNT_INACTIVE'));
  }

  // 5) Check if user account is locked
  if (user.isLocked) {
    return next(AppError.forbidden('Your account is temporarily locked.', 'ACCOUNT_LOCKED'));
  }

  // Grant access to protected route
  req.user = user;
  next();
});

// Validate session token for dashboard requests
const validateSession = catchAsync(async (req, res, next) => {
  // 1) Getting session token from header or body
  let sessionToken;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Session')) {
    sessionToken = req.headers.authorization.split(' ')[1];
  } else if (req.body.token) {
    sessionToken = req.body.token;
  } else if (req.cookies && req.cookies.sessionToken) {
    sessionToken = req.cookies.sessionToken;
  }

  if (!sessionToken) {
    return next(AppError.unauthorized('Session token is required', 'SESSION_TOKEN_REQUIRED'));
  }

  // 2) Find user by session token
  const user = await User.findBySessionToken(sessionToken);
  if (!user) {
    return next(AppError.unauthorized('Invalid or expired session token', 'INVALID_SESSION_TOKEN'));
  }

  // 3) Check if user is active
  if (user.status !== 'active') {
    return next(AppError.forbidden('Your account is inactive. Please contact support.', 'ACCOUNT_INACTIVE'));
  }

  // 4) Check if user account is locked
  if (user.isLocked) {
    return next(AppError.forbidden('Your account is temporarily locked.', 'ACCOUNT_LOCKED'));
  }

  // Grant access to protected route
  req.user = user;
  req.sessionToken = sessionToken;
  next();
});

// Flexible authentication middleware that tries JWT first, then session token
const authenticateUser = catchAsync(async (req, res, next) => {
  // First try JWT authentication
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer')) {
    const token = authHeader.split(' ')[1];
    
    // Debug token information
    console.log(`🔍 Token analysis: length=${token.length}, parts=${token.split('.').length}`);
    
    // Check if token looks like a JWT (has 3 parts separated by dots)
    // JWT tokens are typically much longer and have a specific format
    const parts = token.split('.');
    const isJWT = parts.length === 3 && 
                  token.length > 150 && // JWT tokens are typically 200+ characters
                  parts[1].length > 30; // Payload part should be substantial
    
    console.log(`🔍 JWT check: isJWT=${isJWT}, tokenLength=${token.length}, payloadLength=${parts[1]?.length || 0}`);
    
    if (isJWT) {
      try {
        // Try JWT verification
        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET || 'secret');
        const currentUser = await User.findById(decoded.id).select('+password');
        
        if (currentUser && currentUser.status === 'active' && !currentUser.isLocked) {
          req.user = currentUser;
          return next();
        }
      } catch (error) {
        // JWT failed, continue to session token
        console.log('JWT verification failed, trying as session token');
      }
    }
    
    // If not a JWT or JWT failed, try as session token
    try {
      const user = await User.findBySessionToken(token);
      if (user && user.status === 'active' && !user.isLocked) {
        req.user = user;
        return next();
      }
    } catch (error) {
      console.log('Session token lookup failed:', error.message);
    }
  }
  
  // If no Bearer header, try other sources
  let sessionToken;
  if (req.body.token) {
    sessionToken = req.body.token;
  } else if (req.cookies && req.cookies.sessionToken) {
    sessionToken = req.cookies.sessionToken;
  }
  
  if (sessionToken) {
    try {
      const user = await User.findBySessionToken(sessionToken);
      if (user && user.status === 'active' && !user.isLocked) {
        req.user = user;
        return next();
      }
    } catch (error) {
      console.log('Session token lookup failed:', error.message);
    }
  }
  
  return next(AppError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED'));
});

// Check if user has sufficient credits
const requireCredits = (requiredCredits = 1) => {
  return catchAsync(async (req, res, next) => {
    // If user is authenticated, check their credits
    if (req.user) {
      // Check if user has enough credits
      if (req.user.credits.available < requiredCredits) {
        // Check if user has active subscription
        if (!req.user.hasActiveSubscription) {
          return next(AppError.creditsExhausted('You have exhausted your free credits. Please upgrade to continue.'));
        } else {
          return next(AppError.creditsExhausted('Insufficient credits. Please contact support or upgrade your plan.'));
        }
      }
    } else {
      // For unauthenticated users, check if they're a free user
      if (!req.isFreeUser) {
        return next(AppError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
      }
      // Free users are handled by handleFreeCredits middleware
    }

    next();
  });
};

// Restrict to certain roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('You do not have permission to perform this action', 'INSUFFICIENT_PERMISSIONS'));
    }
    next();
  };
};

// Check subscription status
const requireActiveSubscription = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(AppError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
  }

  if (!req.user.hasActiveSubscription) {
    return next(AppError.subscriptionRequired('Active subscription required to access this feature'));
  }

  next();
});

// Middleware to handle free credits for unauthenticated users
const handleFreeCredits = catchAsync(async (req, res, next) => {
  // If user is authenticated, proceed normally
  if (req.user) {
    return next();
  }

  // For unauthenticated requests, check if they're within free limit
  const clientIP = req.ip || req.connection.remoteAddress;
  const freeCreditsLimit = parseInt(process.env.FREE_CREDITS_LIMIT) || 50;
  
  // Store free usage in a simple in-memory cache (in production, use Redis)
  if (!global.freeCreditsUsage) {
    global.freeCreditsUsage = new Map();
  }
  
  const today = new Date().toDateString();
  const key = `${clientIP}_${today}`;
  const currentUsage = global.freeCreditsUsage.get(key) || 0;
  
  if (currentUsage >= freeCreditsLimit) {
    return next(AppError.creditsExhausted('Free credits exhausted. Please sign up to continue.'));
  }
  
  // Increment usage
  global.freeCreditsUsage.set(key, currentUsage + 1);
  
  // Clean up old entries (keep only today's data)
  for (const [cacheKey] of global.freeCreditsUsage.entries()) {
    if (!cacheKey.endsWith(today)) {
      global.freeCreditsUsage.delete(cacheKey);
    }
  }
  
  req.isFreeUser = true;
  req.freeCreditsUsed = currentUsage + 1;
  next();
});

// Generate JWT token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// Create and send JWT token
const createSendToken = (user, statusCode, res, message = 'Success') => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  user.password = undefined;
  user.sessions = undefined;

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      apiKey: user.apiKey,
      status: user.status,
      credits: user.credits,
      hasActiveSubscription: user.hasActiveSubscription,
      subscription: user.subscription,
      preferences: user.preferences,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    }
  });
};

module.exports = {
  protect,
  validateApiKey,
  validateSession,
  authenticateUser,
  requireCredits,
  restrictTo,
  requireActiveSubscription,
  handleFreeCredits,
  signToken,
  createSendToken
};
