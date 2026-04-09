import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import User from '../models/User';
import { AppError } from '../errors';

/**
 * JWT-based Authentication middleware for Quirkly Next.js API
 * Uses JWT tokens for stateless authentication - no database lookups required
 */

// JWT payload interface
interface JWTPayload {
  id: string;
  email: string;
  role: string;
  status: string;
  credits: {
    available: number;
    used: number;
    total: number;
  };
  hasActiveSubscription: boolean;
  iat: number;
  exp: number;
}

// Get user from JWT token (stateless - no database lookup)
export const getUserFromJWT = (token: string): JWTPayload | null => {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('❌ JWT_SECRET not configured');
      return null;
    }

    // Clean the token (remove any whitespace or extra characters)
    const cleanToken = token.trim();
    
    // Validate token format (should have 3 parts separated by dots)
    const tokenParts = cleanToken.split('.');
    if (tokenParts.length !== 3) {
      console.error('❌ Invalid JWT format - should have 3 parts');
      return null;
    }

    console.log('🔍 JWT token parts:', tokenParts.length);
    console.log('🔍 JWT header:', tokenParts[0]?.substring(0, 20) + '...');
    console.log('🔍 JWT payload:', tokenParts[1]?.substring(0, 20) + '...');

    const decoded = jwt.verify(cleanToken, secret) as JWTPayload;
    
    // Validate token structure
    if (!decoded.id || !decoded.email || !decoded.role) {
      console.error('❌ Invalid token payload - missing required fields');
      return null;
    }

    console.log('✅ JWT verification successful for user:', decoded.email);
    return decoded;
  } catch (error) {
    console.error('❌ JWT verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
};

// Get user from request (JWT-based)
export const getUserFromRequest = async (req: NextRequest): Promise<JWTPayload | null> => {
  const authHeader = req.headers.get('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    console.log('🔍 JWT Auth - token received:', token ? `${token.substring(0, 20)}...` : 'none');
    
    const user = getUserFromJWT(token);
    if (user) {
      console.log('✅ JWT auth successful for user:', user.email);
      return user;
    }
  }
  
  // Try to get token from body
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token;
    
    if (token) {
      console.log('🔍 JWT Auth - trying body token...');
      const user = getUserFromJWT(token);
      if (user) {
        console.log('✅ JWT body token auth successful for user:', user.email);
        return user;
      }
    }
  } catch (error) {
    // Body parsing failed, continue
  }
  
  console.log('❌ No valid JWT authentication found');
  return null;
};

// Protect routes with JWT authentication
export const protect = async (req: NextRequest): Promise<JWTPayload> => {
  const user = await getUserFromRequest(req);
  
  if (!user) {
    throw AppError.unauthorized('You are not logged in! Please log in to get access.', 'NOT_LOGGED_IN');
  }

  // Check if user is active (from JWT payload)
  if (user.status !== 'active') {
    throw AppError.forbidden('Your account is inactive. Please contact support.', 'ACCOUNT_INACTIVE');
  }
  
  return user;
};

// Validate JWT token OR API key for extension requests
// Supports both JWT (Bearer token) and legacy API keys (qk_...)
export const validateApiKey = async (req: NextRequest): Promise<JWTPayload> => {
  // First try JWT authentication
  const jwtUser = await getUserFromRequest(req);
  
  if (jwtUser) {
    // Check if user is active
    if (jwtUser.status !== 'active') {
      throw AppError.forbidden('Your account is inactive. Please contact support.', 'ACCOUNT_INACTIVE');
    }
    return jwtUser;
  }
  
  // If JWT fails, try API key authentication (for extension compatibility)
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    // Check if it's an API key (starts with qk_)
    if (token && token.startsWith('qk_')) {
      console.log('🔍 Trying API key authentication...');
      
      try {
        // Import User model dynamically to avoid circular dependency
        const User = require('../models/User').default;
        const user = await User.findByApiKey(token);
        
        if (user) {
          console.log('✅ API key auth successful for user:', user.email);
          
          // Check if user is active
          if (user.status !== 'active') {
            throw AppError.forbidden('Your account is inactive. Please contact support.', 'ACCOUNT_INACTIVE');
          }
          
          // Convert user to JWTPayload format
          return {
            id: user.id.toString(),
            email: user.email,
            role: user.role,
            status: user.status,
            credits: {
              available: user.credits.available,
              used: user.credits.used,
              total: user.credits.total
            },
            hasActiveSubscription: user.hasActiveSubscription || false,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
          };
        }
      } catch (error) {
        console.error('❌ API key validation error:', error);
        // Continue to throw unauthorized below
      }
    }
  }
  
  throw AppError.unauthorized('Valid authentication required', 'AUTHENTICATION_REQUIRED');
};

// Validate JWT token for dashboard requests (replaces session token validation)
export const validateSession = async (req: NextRequest): Promise<JWTPayload> => {
  const user = await getUserFromRequest(req);
  
  if (!user) {
    throw AppError.unauthorized('Valid JWT token is required', 'JWT_TOKEN_REQUIRED');
  }

  // Check if user is active
  if (user.status !== 'active') {
    throw AppError.forbidden('Your account is inactive. Please contact support.', 'ACCOUNT_INACTIVE');
  }

  return user;
};

// Flexible authentication middleware (JWT-based)
export const authenticateUser = async (req: NextRequest): Promise<JWTPayload> => {
  const user = await getUserFromRequest(req);
  
  if (!user) {
    throw AppError.unauthorized('Authentication required', 'AUTHENTICATION_REQUIRED');
  }
  
  return user;
};

// Check if user has sufficient credits (JWT-based)
export const requireCredits = (requiredCredits: number = 1) => {
  return async (req: NextRequest, user: JWTPayload) => {
    // Check if user has enough credits (from JWT payload)
    if (user.credits.available < requiredCredits) {
      // Check if user has active subscription
      if (!user.hasActiveSubscription) {
        throw AppError.creditsExhausted('You have exhausted your free credits. Please upgrade to continue.');
      } else {
        throw AppError.creditsExhausted('Insufficient credits. Please contact support or upgrade your plan.');
      }
    }

    return true;
  };
};

// Restrict to certain roles (JWT-based)
export const restrictTo = (...roles: string[]) => {
  return (user: JWTPayload) => {
    if (!roles.includes(user.role)) {
      throw AppError.forbidden('You do not have permission to perform this action', 'INSUFFICIENT_PERMISSIONS');
    }
    return true;
  };
};

// Check subscription status (JWT-based)
export const requireActiveSubscription = async (user: JWTPayload) => {
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

// Generate JWT token with user data
export const signToken = (user: any) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  const payload: JWTPayload = {
    id: user.id.toString(),
    email: user.email,
    role: user.role,
    status: user.status,
    credits: {
      available: user.credits.available,
      used: user.credits.used,
      total: user.credits.total
    },
    hasActiveSubscription: user.hasActiveSubscription || false
  };
  
  console.log('🔑 Generating JWT token for user:', user.email);
  console.log('🔑 JWT payload:', JSON.stringify(payload, null, 2));
  
  const token = jwt.sign(payload, secret, {
    expiresIn: expiresIn as any,
    algorithm: 'HS256'
  });
  
  console.log('🔑 Generated JWT token length:', token.length);
  console.log('🔑 JWT token preview:', token.substring(0, 50) + '...');
  
  return token;
};

// Create and send JWT token
export const createSendToken = (user: any, statusCode: number, message: string = 'Success') => {
  const token = signToken(user);
  
  // Remove password from output
  const userResponse = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
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
