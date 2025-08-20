import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import User from '../models/User';
import { AppError } from '../errors';

/**
 * Authentication middleware for Quirkly Next.js API
 * Handles JWT tokens, API keys, and session validation
 */

// Get user from request (helper function)
export const getUserFromRequest = async (req: NextRequest) => {
  // Try to get user from various authentication methods
  const authHeader = req.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer')) {
    const token = authHeader.split(' ')[1];
    console.log('🔍 Auth middleware - token received:', token ? `${token.substring(0, 10)}...` : 'none');
    
    // Check if token looks like a JWT
    const parts = token.split('.');
    const isJWT = parts.length === 3 && 
                  token.length > 150 && 
                  parts[1].length > 30;
    
    console.log('🔍 Auth middleware - token type:', isJWT ? 'JWT' : 'Session token');
    
    if (isJWT) {
      try {
        // Try JWT verification
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        const currentUser = await User.findById(decoded.id).select('+password');
        
        if (currentUser && currentUser.status === 'active' && !currentUser.isLocked) {
          console.log('✅ JWT auth successful for user:', currentUser.email);
          return currentUser;
        }
      } catch (error) {
        // JWT failed, continue to session token
        console.log('❌ JWT verification failed, trying as session token');
      }
    }
    
    // If not a JWT or JWT failed, try as session token
    try {
      console.log('🔍 Trying session token validation...');
      const user = await User.findBySessionToken(token);
      if (user && user.status === 'active' && !user.isLocked) {
        console.log('✅ Session token auth successful for user:', user.email);
        return user;
      } else {
        console.log('❌ Session token validation failed - user not found or inactive');
      }
    } catch (error) {
      console.log('❌ Session token lookup failed:', error);
    }
  }
  
  // Try to get token from body or cookies
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token;
    
    if (token) {
      console.log('🔍 Trying body token validation...');
      const user = await User.findBySessionToken(token);
      if (user && user.status === 'active' && !user.isLocked) {
        console.log('✅ Body token auth successful for user:', user.email);
        return user;
      }
    }
  } catch (error) {
    // Body parsing failed, continue
  }
  
  console.log('❌ No valid authentication found');
  return null;
};

// Protect routes with authentication
export const protect = async (req: NextRequest) => {
  const user = await getUserFromRequest(req);
  
  if (!user) {
    throw AppError.unauthorized('You are not logged in! Please log in to get access.', 'NOT_LOGGED_IN');
  }
  
  return user;
};

// Validate API key for extension requests
export const validateApiKey = async (req: NextRequest) => {
  // Get API key from header or body
  let apiKey = req.headers.get('authorization')?.split(' ')[1];
  
  if (!apiKey) {
    try {
      const body = await req.json().catch(() => ({}));
      apiKey = body.apiKey;
    } catch (error) {
      // Body parsing failed
    }
  }
  
  if (!apiKey) {
    throw AppError.unauthorized('API key is required', 'API_KEY_REQUIRED');
  }

  // Validate API key format
  if (!apiKey.startsWith('qk_')) {
    throw AppError.unauthorized('Invalid API key format', 'INVALID_API_KEY_FORMAT');
  }

  // Find user by API key
  const user = await User.findByApiKey(apiKey);
  if (!user) {
    throw AppError.unauthorized('Invalid API key', 'INVALID_API_KEY');
  }

  // Check if user is active
  if (user.status !== 'active') {
    throw AppError.forbidden('Your account is inactive. Please contact support.', 'ACCOUNT_INACTIVE');
  }

  // Check if user account is locked
  if (user.isLocked) {
    throw AppError.forbidden('Your account is temporarily locked.', 'ACCOUNT_LOCKED');
  }

  return user;
};

// Validate session token for dashboard requests
export const validateSession = async (req: NextRequest) => {
  // Get session token from header or body
  let sessionToken = req.headers.get('authorization')?.split(' ')[1];
  
  if (!sessionToken) {
    try {
      const body = await req.json().catch(() => ({}));
      sessionToken = body.token;
    } catch (error) {
      // Body parsing failed
    }
  }

  if (!sessionToken) {
    throw AppError.unauthorized('Session token is required', 'SESSION_TOKEN_REQUIRED');
  }

  // Find user by session token
  const user = await User.findBySessionToken(sessionToken);
  if (!user) {
    throw AppError.unauthorized('Invalid or expired session token', 'INVALID_SESSION_TOKEN');
  }

  // Check if user is active
  if (user.status !== 'active') {
    throw AppError.forbidden('Your account is inactive. Please contact support.', 'ACCOUNT_INACTIVE');
  }

  return user;
};

// Flexible authentication middleware that tries JWT first, then session token
export const authenticateUser = async (req: NextRequest) => {
  const user = await getUserFromRequest(req);
  
  if (!user) {
    throw AppError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED');
  }
  
  return user;
};

// Check if user has sufficient credits
export const requireCredits = (requiredCredits: number = 1) => {
  return async (req: NextRequest, user: any) => {
    // If user is authenticated, check their credits
    if (user) {
      // Check if user has enough credits
      if (user.credits.available < requiredCredits) {
        // Check if user has active subscription
        if (!user.hasActiveSubscription) {
          throw AppError.creditsExhausted('You have exhausted your free credits. Please upgrade to continue.');
        } else {
          throw AppError.creditsExhausted('Insufficient credits. Please contact support or upgrade your plan.');
        }
      }
    } else {
      // For unauthenticated users, check if they're a free user
      const freeUserCheck = await handleFreeCredits(req);
      if (!freeUserCheck.isFreeUser) {
        throw AppError.unauthorized('Authentication required', 'AUTH_REQUIRED');
      }
      // Free users are handled by handleFreeCredits middleware
    }

    return true;
  };
};

// Restrict to certain roles
export const restrictTo = (...roles: string[]) => {
  return (user: any) => {
    if (!roles.includes(user.role)) {
      throw AppError.forbidden('You do not have permission to perform this action', 'INSUFFICIENT_PERMISSIONS');
    }
    return true;
  };
};

// Check subscription status
export const requireActiveSubscription = async (user: any) => {
  if (!user) {
    throw AppError.unauthorized('Authentication required', 'AUTH_REQUIRED');
  }

  if (!user.hasActiveSubscription) {
    throw AppError.subscriptionRequired('Active subscription required to access this feature');
  }

  return true;
};

// Middleware to handle free credits for unauthenticated users
export const handleFreeCredits = async (req: NextRequest) => {
  // If user is authenticated, proceed normally
  const user = await getUserFromRequest(req);
  if (user) {
    return { user, isFreeUser: false };
  }

  // For unauthenticated requests, check if they're within free limit
  const clientIP = req.ip || 'unknown';
  const freeCreditsLimit = parseInt(process.env.FREE_CREDITS_LIMIT || '50');
  
  // Store free usage in a simple in-memory cache (in production, use Redis)
  if (!global.freeCreditsUsage) {
    global.freeCreditsUsage = new Map();
  }
  
  const today = new Date().toDateString();
  const key = `${clientIP}_${today}`;
  const currentUsage = global.freeCreditsUsage.get(key) || 0;
  
  if (currentUsage >= freeCreditsLimit) {
    throw AppError.creditsExhausted('Free credits exhausted. Please sign up to continue.');
  }
  
  // Increment usage
  global.freeCreditsUsage.set(key, currentUsage + 1);
  
  // Clean up old entries (keep only today's data)
  for (const [cacheKey] of global.freeCreditsUsage.entries()) {
    if (!cacheKey.endsWith(today)) {
      global.freeCreditsUsage.delete(cacheKey);
    }
  }
  
  return { user: null, isFreeUser: true, freeCreditsUsed: currentUsage + 1 };
};

// Generate JWT token
export const signToken = (id: string) => {
  const secret = process.env.JWT_SECRET || 'secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  return jwt.sign({ id }, secret, {
    expiresIn: expiresIn as any,
  });
};

// Create and send JWT token
export const createSendToken = (user: any, statusCode: number, message: string = 'Success') => {
  const token = signToken(user._id);
  
  // Remove password from output
  const userResponse = {
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
  };

  return NextResponse.json({
    success: true,
    message,
    token,
    user: userResponse
  }, { status: statusCode });
};
