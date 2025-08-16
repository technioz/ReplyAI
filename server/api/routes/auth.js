const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { AppError } = require('../utils/AppError');
const { catchAsync } = require('../middleware/errorHandler');
const { 
  validateApiKey, 
  validateSession,
  createSendToken,
  authenticateUser
} = require('../middleware/auth');

const router = express.Router();

/**
 * Authentication Routes for Quirkly API Server
 * Handles signup, login, logout, API key validation, session management
 */

// Validation rules
const signupValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name is required and must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Full name can only contain letters and spaces')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Helper function to check validation results
const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(AppError.validationError('Validation failed', errorMessages));
  }
  next();
};

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
const signup = catchAsync(async (req, res, next) => {
  const { email, password, fullName, action, timestamp, source } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(AppError.conflict('An account with this email already exists'));
  }

  // Split fullName into firstName and lastName
  const nameParts = fullName.trim().split(/\s+/);
  let firstName, lastName;
  
  if (nameParts.length === 1) {
    // Only one name provided, use it as firstName
    firstName = nameParts[0];
    lastName = '';
  } else {
    // Multiple names provided, use first as firstName and rest as lastName
    firstName = nameParts[0];
    lastName = nameParts.slice(1).join(' ');
  }

  // Validate name lengths
  if (firstName.length > 50) {
    return next(AppError.badRequest('First name is too long (max 50 characters)'));
  }
  if (lastName.length > 50) {
    return next(AppError.badRequest('Last name is too long (max 50 characters)'));
  }

  // Create new user
  const newUser = await User.create({
    email,
    password,
    firstName,
    lastName,
    credits: {
      available: 50,
      used: 0,
      total: 50,
      lastResetAt: new Date()
    }
  });

  // Generate API key
  newUser.generateApiKey();
  await newUser.save();

  // Create session token for dashboard
  const userAgent = req.get('User-Agent') || 'unknown';
  const ipAddress = req.ip || 'unknown';
  const sessionToken = newUser.createSessionToken(userAgent, ipAddress);
  await newUser.save();

  // Log successful signup
  console.log(`✅ New user registered: ${email} (${firstName} ${lastName}) from ${source || 'unknown'}`);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    user: {
      id: newUser._id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      fullName: newUser.fullName,
      apiKey: newUser.apiKey,
      status: newUser.status,
      credits: newUser.credits,
      hasActiveSubscription: newUser.hasActiveSubscription,
      preferences: newUser.preferences,
      createdAt: newUser.createdAt
    },
    sessionToken,
    timestamp: new Date().toISOString()
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = catchAsync(async (req, res, next) => {
  const { email, password, action, timestamp, source } = req.body;

  // Check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password))) {
    // Increment login attempts if user exists
    if (user) {
      await user.incLoginAttempts();
    }
    return next(AppError.invalidCredentials());
  }

  // Check if account is locked
  if (user.isLocked) {
    return next(AppError.accountLocked());
  }

  // Check if account is active
  if (user.status !== 'active') {
    return next(AppError.accountInactive());
  }

  // Reset login attempts on successful login
  await user.resetLoginAttempts();

  // Update last login info
  user.lastLoginAt = new Date();
  user.lastLoginIP = req.ip || 'unknown';

  // Create session token for dashboard
  const userAgent = req.get('User-Agent') || 'unknown';
  const ipAddress = req.ip || 'unknown';
  const sessionToken = user.createSessionToken(userAgent, ipAddress);
  
  // Clean expired sessions
  user.cleanExpiredSessions();
  await user.save();

  // Log successful login
  console.log(`✅ User logged in: ${email} from ${source || 'unknown'}`);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      apiKey: user.apiKey,
      status: user.status,
      role: user.role,
      credits: user.credits,
      hasActiveSubscription: user.hasActiveSubscription,
      subscription: user.subscription,
      preferences: user.preferences,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt
    },
    token: sessionToken,
    sessionToken,
    timestamp: new Date().toISOString()
  });
});

// @desc    Validate API key (for Chrome extension)
// @route   POST /api/auth/validate
// @access  Public
const validateApiKeyRoute = catchAsync(async (req, res, next) => {
  const { apiKey, action, timestamp, source } = req.body;

  if (!apiKey) {
    return next(AppError.badRequest('API key is required'));
  }

  console.log(`🔑 Validating API key: ${apiKey.substring(0, 20)}...`);

  // Check database connection first
  const mongoose = require('mongoose');
  if (mongoose.connection.readyState !== 1) {
    console.log(`❌ Database not ready, state: ${mongoose.connection.readyState}`);
    return next(AppError.internal('Database connection not ready, please try again'));
  }

  // Find user by API key with timeout
  let user;
  try {
    user = await Promise.race([
      User.findByApiKey(apiKey),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 8000)
      )
    ]);
  } catch (error) {
    if (error.message === 'Database query timeout') {
      console.log(`⏰ Database query timed out for API key validation`);
      return next(AppError.internal('Database query timeout, please try again'));
    }
    throw error;
  }
  
  if (!user) {
    console.log(`❌ API key not found in database`);
    return next(AppError.invalidApiKey());
  }

  console.log(`✅ API key found for user: ${user.email}`);

  // Check if account is active
  if (user.status !== 'active') {
    return next(AppError.accountInactive());
  }

  // Check if account is locked
  if (user.isLocked) {
    return next(AppError.accountLocked());
  }

  // Update last login
  user.lastLoginAt = new Date();
  user.lastLoginIP = req.ip || 'unknown';
  await user.save();

  console.log(`✅ API key validated: ${user.email} from ${source || 'unknown'}`);

  res.status(200).json({
    success: true,
    message: 'API key is valid',
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
    },
    timestamp: new Date().toISOString()
  });
});

// @desc    Validate session token (for dashboard)
// @route   POST /api/auth/validate-session
// @access  Public
const validateSessionRoute = catchAsync(async (req, res, next) => {
  const { token, action, timestamp, source } = req.body;

  if (!token) {
    return next(AppError.badRequest('Session token is required'));
  }

  // Find user by session token
  const user = await User.findBySessionToken(token);
  if (!user) {
    return next(AppError.unauthorized('Invalid or expired session token', 'INVALID_SESSION_TOKEN'));
  }

  // Check if account is active
  if (user.status !== 'active') {
    return next(AppError.accountInactive());
  }

  console.log(`✅ Session validated: ${user.email} from ${source || 'unknown'}`);

  res.status(200).json({
    success: true,
    message: 'Session is valid',
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
    },
    timestamp: new Date().toISOString()
  });
});

// @desc    Logout user (invalidate session)
// @route   POST /api/auth/logout
// @access  Private
const logout = catchAsync(async (req, res, next) => {
  const { token, action, timestamp, source } = req.body;

  if (!token) {
    return next(AppError.badRequest('Session token is required'));
  }

  // Find user and invalidate session
  const user = await User.findBySessionToken(token);
  if (user) {
    user.invalidateSession(token);
    await user.save();
    console.log(`✅ User logged out: ${user.email} from ${source || 'unknown'}`);
  }

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
    timestamp: new Date().toISOString()
  });
});

// @desc    Generate new API key
// @route   POST /api/auth/generate-api-key
// @access  Private (requires valid session)
const generateApiKey = catchAsync(async (req, res, next) => {
  const { token, action, timestamp, source } = req.body;

  if (!token) {
    return next(AppError.badRequest('Session token is required'));
  }

  // Find user by session token
  const user = await User.findBySessionToken(token);
  if (!user) {
    return next(AppError.unauthorized('Invalid or expired session token', 'INVALID_SESSION_TOKEN'));
  }

  // Generate new API key
  const oldApiKey = user.apiKey;
  user.generateApiKey();
  await user.save();

  console.log(`✅ New API key generated: ${user.email} from ${source || 'unknown'}`);

  res.status(200).json({
    success: true,
    message: 'New API key generated successfully',
    apiKey: user.apiKey,
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
      preferences: user.preferences
    },
    timestamp: new Date().toISOString()
  });
});

// @desc    Refresh session token
// @route   POST /api/auth/refresh
// @access  Private
const refresh = catchAsync(async (req, res, next) => {
  const { token, action, timestamp, source } = req.body;

  if (!token) {
    return next(AppError.badRequest('Session token is required'));
  }

  // Find user by session token
  const user = await User.findBySessionToken(token);
  if (!user) {
    return next(AppError.unauthorized('Invalid or expired session token', 'INVALID_SESSION_TOKEN'));
  }

  // Invalidate old session and create new one
  user.invalidateSession(token);
  const userAgent = req.get('User-Agent') || 'unknown';
  const ipAddress = req.ip || 'unknown';
  const newSessionToken = user.createSessionToken(userAgent, ipAddress);
  
  // Clean expired sessions
  user.cleanExpiredSessions();
  await user.save();

  console.log(`✅ Session refreshed: ${user.email} from ${source || 'unknown'}`);

  res.status(200).json({
    success: true,
    message: 'Session refreshed successfully',
    sessionToken: newSessionToken,
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
      lastLoginAt: user.lastLoginAt
    },
    timestamp: new Date().toISOString()
  });
});

// Routes with different actions (backward compatibility with n8n workflow)
router.post('/', catchAsync(async (req, res, next) => {
  const { action } = req.body;

  switch (action) {
    case 'signup':
      return signup(req, res, next);
    case 'login':
      return login(req, res, next);
    case 'validate':
      return validateApiKeyRoute(req, res, next);
    case 'validate_session':
      return validateSessionRoute(req, res, next);
    case 'logout':
      return logout(req, res, next);
    case 'generate_api_key':
      return generateApiKey(req, res, next);
    case 'refresh':
      return refresh(req, res, next);
    default:
      return next(AppError.badRequest(`Unknown action: ${action}`, 'UNKNOWN_ACTION'));
  }
}));

// Individual routes
router.post('/signup', signupValidation, checkValidation, signup);
router.post('/login', loginValidation, checkValidation, login);
router.post('/validate', validateApiKeyRoute);
router.post('/validate-session', validateSessionRoute);
router.post('/logout', logout);
router.post('/generate-api-key', generateApiKey);
router.post('/refresh', refresh);

// @desc    Get current user info
// @route   GET /api/auth/me
// @access  Private
router.get('/me', authenticateUser, catchAsync(async (req, res, next) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      fullName: req.user.fullName,
      apiKey: req.user.apiKey,
      status: req.user.status,
      credits: req.user.credits,
      hasActiveSubscription: req.user.hasActiveSubscription,
      subscription: req.user.subscription,
      preferences: req.user.preferences,
      createdAt: req.user.createdAt,
      lastLoginAt: req.user.lastLoginAt
    }
  });
}));

module.exports = router;
