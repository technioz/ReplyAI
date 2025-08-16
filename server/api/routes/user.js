const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { AppError } = require('../utils/AppError');
const { catchAsync } = require('../middleware/errorHandler');
const { validateApiKey, authenticateUser, restrictTo } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

/**
 * User Management Routes for Quirkly API Server
 * Handles user profile, preferences, and account management
 */

// @desc    Get user profile
// @route   GET /api/user/profile
// @access  Private
router.get('/profile', authenticateUser, catchAsync(async (req, res, next) => {
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
      role: req.user.role,
      credits: req.user.credits,
      hasActiveSubscription: req.user.hasActiveSubscription,
      subscription: req.user.subscription,
      preferences: req.user.preferences,
      createdAt: req.user.createdAt,
      lastLoginAt: req.user.lastLoginAt,
      emailVerified: req.user.emailVerified
    },
    timestamp: new Date().toISOString()
  });
}));

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
router.put('/profile', [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
], authenticateUser, catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(AppError.validationError('Validation failed', errorMessages));
  }

  const { firstName, lastName, email } = req.body;
  const updates = {};

  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  
  // Handle email change (requires verification in production)
  if (email !== undefined && email !== req.user.email) {
    // Check if email is already taken
    const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
    if (existingUser) {
      return next(AppError.conflict('Email address is already in use'));
    }
    updates.email = email;
    updates.emailVerified = false; // Reset verification status
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    user: {
      id: updatedUser._id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      fullName: updatedUser.fullName,
      emailVerified: updatedUser.emailVerified
    },
    timestamp: new Date().toISOString()
  });
}));

// @desc    Update user preferences
// @route   PUT /api/user/preferences
// @access  Private
router.put('/preferences', [
  body('defaultTone')
    .optional()
    .isIn(['professional', 'casual', 'humorous', 'empathetic', 'analytical', 'enthusiastic'])
    .withMessage('Invalid default tone'),
  body('notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be boolean'),
  body('notifications.marketing')
    .optional()
    .isBoolean()
    .withMessage('Marketing notifications must be boolean')
], authenticateUser, catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(AppError.validationError('Validation failed', errorMessages));
  }

  const { defaultTone, notifications } = req.body;
  const updates = {};

  if (defaultTone !== undefined) {
    updates['preferences.defaultTone'] = defaultTone;
  }

  if (notifications) {
    if (notifications.email !== undefined) {
      updates['preferences.notifications.email'] = notifications.email;
    }
    if (notifications.marketing !== undefined) {
      updates['preferences.notifications.marketing'] = notifications.marketing;
    }
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Preferences updated successfully',
    preferences: updatedUser.preferences,
    timestamp: new Date().toISOString()
  });
}));

// @desc    Change password
// @route   PUT /api/user/password
// @access  Private
router.put('/password', [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
], authenticateUser, catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(AppError.validationError('Validation failed', errorMessages));
  }

  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  if (!(await user.correctPassword(currentPassword))) {
    return next(AppError.unauthorized('Current password is incorrect'));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Invalidate all sessions except current one
  user.sessions = user.sessions.filter(session => 
    session.token === req.sessionToken
  );
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully',
    timestamp: new Date().toISOString()
  });
}));

// @desc    Generate new API key
// @route   POST /api/user/api-key
// @access  Private
router.post('/api-key', authenticateUser, catchAsync(async (req, res, next) => {
  const oldApiKey = req.user.apiKey;
  req.user.generateApiKey();
  await req.user.save();

  console.log(`✅ New API key generated for user: ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'New API key generated successfully',
    apiKey: req.user.apiKey,
    timestamp: new Date().toISOString()
  });
}));

// @desc    Get user statistics
// @route   GET /api/user/stats
// @access  Private
router.get('/stats', authenticateUser, catchAsync(async (req, res, next) => {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Calculate statistics
  const totalReplies = req.user.usage.reduce((total, day) => total + day.repliesGenerated, 0);
  const totalCreditsUsed = req.user.usage.reduce((total, day) => total + day.creditsUsed, 0);
  const accountAgeDays = Math.ceil((now - req.user.createdAt) / (1000 * 60 * 60 * 24));
  
  // Current month stats
  const monthlyUsage = req.user.usage.filter(u => u.month === currentMonth);
  const monthlyReplies = monthlyUsage.reduce((total, day) => total + day.repliesGenerated, 0);
  const monthlyCredits = monthlyUsage.reduce((total, day) => total + day.creditsUsed, 0);
  const activeDaysThisMonth = monthlyUsage.length;
  
  // Today's stats
  const today = new Date().toDateString();
  const todayUsage = req.user.usage.find(u => u.date.toDateString() === today);
  
  res.status(200).json({
    success: true,
    stats: {
      account: {
        createdAt: req.user.createdAt,
        ageDays: accountAgeDays,
        lastLoginAt: req.user.lastLoginAt,
        status: req.user.status
      },
      usage: {
        total: {
          replies: totalReplies,
          creditsUsed: totalCreditsUsed,
          averageRepliesPerDay: accountAgeDays > 0 ? Math.round(totalReplies / accountAgeDays * 100) / 100 : 0
        },
        thisMonth: {
          replies: monthlyReplies,
          creditsUsed: monthlyCredits,
          activeDays: activeDaysThisMonth
        },
        today: {
          replies: todayUsage ? todayUsage.repliesGenerated : 0,
          creditsUsed: todayUsage ? todayUsage.creditsUsed : 0
        }
      },
      credits: {
        available: req.user.credits.available,
        used: req.user.credits.used,
        total: req.user.credits.total,
        lastResetAt: req.user.credits.lastResetAt,
        utilizationRate: req.user.credits.total > 0 ? 
          Math.round((req.user.credits.used / req.user.credits.total) * 100) : 0
      },
      subscription: {
        hasActive: req.user.hasActiveSubscription,
        plan: req.user.subscription ? req.user.subscription.plan : 'free',
        status: req.user.subscription ? req.user.subscription.status : null,
        currentPeriodEnd: req.user.subscription ? req.user.subscription.currentPeriodEnd : null
      }
    },
    timestamp: new Date().toISOString()
  });
}));

// @desc    Delete user account
// @route   DELETE /api/user/account
// @access  Private
router.delete('/account', [
  body('password')
    .notEmpty()
    .withMessage('Password is required to delete account'),
  body('confirmation')
    .equals('DELETE')
    .withMessage('Please type DELETE to confirm account deletion')
], authenticateUser, catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(AppError.validationError('Validation failed', errorMessages));
  }

  const { password } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Verify password
  if (!(await user.correctPassword(password))) {
    return next(AppError.unauthorized('Password is incorrect'));
  }

  // In production, you might want to:
  // 1. Cancel any active subscriptions
  // 2. Export user data
  // 3. Send confirmation email
  // 4. Soft delete instead of hard delete

  await User.findByIdAndDelete(req.user._id);

  console.log(`🗑️ User account deleted: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Account deleted successfully',
    timestamp: new Date().toISOString()
  });
}));

// Admin routes
// @desc    Get all users (admin only)
// @route   GET /api/user/admin/users
// @access  Private (Admin only)
router.get('/admin/users', authenticateUser, restrictTo('admin'), catchAsync(async (req, res, next) => {
  const { page = 1, limit = 20, status, search } = req.query;
  
  const query = {};
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(query)
    .select('-password -sessions')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    },
    timestamp: new Date().toISOString()
  });
}));

// @desc    Update user status (admin only)
// @route   PUT /api/user/admin/users/:userId/status
// @access  Private (Admin only)
router.put('/admin/users/:userId/status', [
  body('status')
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Invalid status')
], authenticateUser, restrictTo('admin'), catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(AppError.validationError('Validation failed', errorMessages));
  }

  const { userId } = req.params;
  const { status } = req.body;

  const user = await User.findByIdAndUpdate(
    userId,
    { status },
    { new: true, runValidators: true }
  ).select('-password -sessions');

  if (!user) {
    return next(AppError.notFound('User not found'));
  }

  console.log(`👮 Admin ${req.user.email} updated user ${user.email} status to ${status}`);

  res.status(200).json({
    success: true,
    message: `User status updated to ${status}`,
    user,
    timestamp: new Date().toISOString()
  });
}));

// @desc    Get all user API keys
// @route   GET /api/user/api-keys
// @access  Private
router.get('/api-keys', authenticateUser, catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return next(AppError.notFound('User not found'));
  }

  // Return API keys with creation dates and last used info
  const apiKeys = user.apiKeys || [];
  const formattedKeys = apiKeys.map(key => ({
    id: key._id,
    key: key.key,
    name: key.name || 'Default',
    createdAt: key.createdAt,
    lastUsedAt: key.lastUsedAt,
    isActive: key.isActive !== false
  }));

  res.status(200).json({
    success: true,
    apiKeys: formattedKeys,
    count: formattedKeys.length,
    timestamp: new Date().toISOString()
  });
}));

// @desc    Generate new API key
// @route   POST /api/user/api-keys
// @access  Private
router.post('/api-keys', [
  body('name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Name must be between 1 and 50 characters')
], authenticateUser, catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(AppError.validationError('Validation failed', errorMessages));
  }

  const { name } = req.body;
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return next(AppError.notFound('User not found'));
  }

  // Check API key limit (max 5 keys per user)
  const currentKeys = user.apiKeys || [];
  if (currentKeys.length >= 5) {
    return next(AppError.badRequest('Maximum number of API keys reached (5)'));
  }

  // Generate new API key
  const keyId = crypto.randomBytes(8).toString('hex');
  const keySecret = crypto.randomBytes(32).toString('hex');
  const newApiKey = `qk_${keyId}_${keySecret}`;

  const apiKeyObject = {
    key: newApiKey,
    name: name || `API Key ${currentKeys.length + 1}`,
    createdAt: new Date(),
    lastUsedAt: null,
    isActive: true
  };

  // Initialize apiKeys array if it doesn't exist
  if (!user.apiKeys) {
    user.apiKeys = [];
  }

  user.apiKeys.push(apiKeyObject);
  
  // If this is the first API key, also set it as the main apiKey field for backward compatibility
  if (!user.apiKey) {
    user.apiKey = newApiKey;
  }

  await user.save();

  console.log(`🔑 User ${user.email} generated new API key: ${name || 'Default'}`);

  res.status(201).json({
    success: true,
    message: 'API key generated successfully',
    apiKey: {
      id: apiKeyObject._id,
      key: newApiKey,
      name: apiKeyObject.name,
      createdAt: apiKeyObject.createdAt,
      isActive: apiKeyObject.isActive
    },
    timestamp: new Date().toISOString()
  });
}));

// @desc    Delete API key
// @route   DELETE /api/user/api-keys/:keyId
// @access  Private
router.delete('/api-keys/:keyId', authenticateUser, catchAsync(async (req, res, next) => {
  const { keyId } = req.params;
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return next(AppError.notFound('User not found'));
  }

  if (!user.apiKeys || user.apiKeys.length === 0) {
    return next(AppError.notFound('No API keys found'));
  }

  // Find and remove the API key
  const keyIndex = user.apiKeys.findIndex(key => key._id.toString() === keyId);
  
  if (keyIndex === -1) {
    return next(AppError.notFound('API key not found'));
  }

  const deletedKey = user.apiKeys[keyIndex];
  user.apiKeys.splice(keyIndex, 1);

  // If the deleted key was the main apiKey, update it to the first remaining key or null
  if (user.apiKey === deletedKey.key) {
    user.apiKey = user.apiKeys.length > 0 ? user.apiKeys[0].key : null;
  }

  await user.save();

  console.log(`🗑️  User ${user.email} deleted API key: ${deletedKey.name}`);

  res.status(200).json({
    success: true,
    message: 'API key deleted successfully',
    deletedKey: {
      id: deletedKey._id,
      name: deletedKey.name
    },
    timestamp: new Date().toISOString()
  });
}));

// @desc    Update API key (rename or activate/deactivate)
// @route   PUT /api/user/api-keys/:keyId
// @access  Private
router.put('/api-keys/:keyId', [
  body('name').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Name must be between 1 and 50 characters'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], authenticateUser, catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(AppError.validationError('Validation failed', errorMessages));
  }

  const { keyId } = req.params;
  const { name, isActive } = req.body;
  const user = await User.findById(req.user._id);
  
  if (!user) {
    return next(AppError.notFound('User not found'));
  }

  if (!user.apiKeys || user.apiKeys.length === 0) {
    return next(AppError.notFound('No API keys found'));
  }

  // Find the API key
  const apiKey = user.apiKeys.find(key => key._id.toString() === keyId);
  
  if (!apiKey) {
    return next(AppError.notFound('API key not found'));
  }

  // Update fields if provided
  if (name !== undefined) {
    apiKey.name = name;
  }
  if (isActive !== undefined) {
    apiKey.isActive = isActive;
  }

  await user.save();

  console.log(`✏️  User ${user.email} updated API key: ${apiKey.name}`);

  res.status(200).json({
    success: true,
    message: 'API key updated successfully',
    apiKey: {
      id: apiKey._id,
      key: apiKey.key,
      name: apiKey.name,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      isActive: apiKey.isActive
    },
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;
