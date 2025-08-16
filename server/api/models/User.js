const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * User Model for Quirkly API Server
 * Handles user authentication, API keys, subscriptions, and credits
 */

const sessionSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true
    // Removed unique: true to prevent index issues with empty sessions
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  userAgent: {
    type: String,
    default: 'unknown'
  },
  ipAddress: {
    type: String,
    default: 'unknown'
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const subscriptionSchema = new mongoose.Schema({
  stripeSubscriptionId: {
    type: String,
    required: true
  },
  stripePriceId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'canceled', 'past_due', 'unpaid', 'trialing'],
    required: true
  },
  currentPeriodStart: {
    type: Date,
    required: true
  },
  currentPeriodEnd: {
    type: Date,
    required: true
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  },
  plan: {
    type: String,
    enum: ['basic', 'pro', 'enterprise'],
    required: true
  },
  creditsIncluded: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const usageSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  creditsUsed: {
    type: Number,
    default: 0
  },
  repliesGenerated: {
    type: Number,
    default: 0
  },
  month: {
    type: String, // Format: YYYY-MM
    required: true
  },
  year: {
    type: Number,
    required: true
  }
});

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: false, // Made optional since some users might only provide first name
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters'],
    default: '' // Default to empty string
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },
  apiKeys: [{
    key: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'API key name cannot exceed 50 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastUsedAt: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  
  // Authentication & Security
  sessions: {
    type: [sessionSchema],
    default: []
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockedUntil: {
    type: Date
  },
  lastLoginAt: {
    type: Date
  },
  lastLoginIP: {
    type: String
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  
  // Subscription & Credits
  subscription: subscriptionSchema,
  credits: {
    available: {
      type: Number,
      default: 50 // 50 free credits
    },
    used: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 50
    },
    lastResetAt: {
      type: Date,
      default: Date.now
    }
  },
  
  // Usage tracking
  usage: [usageSchema],
  
  // Stripe customer info
  stripeCustomerId: {
    type: String,
    sparse: true
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Settings
  preferences: {
    defaultTone: {
      type: String,
      enum: ['professional', 'casual', 'humorous', 'empathetic', 'analytical', 'enthusiastic'],
      default: 'professional'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      marketing: {
        type: Boolean,
        default: false
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance (only add explicit indexes for fields without inline indexes)
userSchema.index({ createdAt: -1 });
userSchema.index({ status: 1 });
// Add index for apiKeys array queries
userSchema.index({ 'apiKeys.key': 1, status: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.lastName && this.lastName.trim()) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockedUntil && this.lockedUntil > Date.now());
});

// Virtual for subscription status
userSchema.virtual('hasActiveSubscription').get(function() {
  return this.subscription && 
         this.subscription.status === 'active' && 
         this.subscription.currentPeriodEnd > new Date();
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only run if password was modified
  if (!this.isModified('password')) return next();
  
  // Hash password with cost of 12
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, saltRounds);
  
  next();
});

// Pre-save middleware to update timestamps
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance method to check password
userSchema.methods.correctPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate API key
userSchema.methods.generateApiKey = function() {
  const prefix = 'qk_';
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now().toString(36);
  this.apiKey = `${prefix}${timestamp}_${randomBytes}`;
  return this.apiKey;
};

// Instance method to create session token
userSchema.methods.createSessionToken = function(userAgent = 'unknown', ipAddress = 'unknown') {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  const session = {
    token,
    createdAt: new Date(),
    expiresAt,
    userAgent,
    ipAddress,
    isActive: true
  };
  
  this.sessions.push(session);
  return token;
};

// Instance method to invalidate session
userSchema.methods.invalidateSession = function(token) {
  const session = this.sessions.find(s => s.token === token);
  if (session) {
    session.isActive = false;
  }
  return session;
};

// Instance method to clean expired sessions
userSchema.methods.cleanExpiredSessions = function() {
  const now = new Date();
  this.sessions = this.sessions.filter(session => 
    session.expiresAt > now && session.isActive
  );
};

// Instance method to handle failed login
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockedUntil && this.lockedUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        lockedUntil: 1
      },
      $set: {
        loginAttempts: 1
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // If we have hit max attempts and it's not locked, lock account
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockedUntil: Date.now() + lockTime };
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockedUntil: 1
    },
    $set: {
      lastLoginAt: new Date()
    }
  });
};

// Instance method to use credits
userSchema.methods.useCredits = function(amount = 1) {
  if (this.credits.available < amount) {
    throw new Error('Insufficient credits');
  }
  
  this.credits.available -= amount;
  this.credits.used += amount;
  
  // Update usage tracking
  const today = new Date();
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  let todayUsage = this.usage.find(u => 
    u.date.toDateString() === today.toDateString()
  );
  
  if (!todayUsage) {
    todayUsage = {
      date: today,
      creditsUsed: 0,
      repliesGenerated: 0,
      month: monthKey,
      year: today.getFullYear()
    };
    this.usage.push(todayUsage);
  }
  
  todayUsage.creditsUsed += amount;
  todayUsage.repliesGenerated += 1;
  
  return this.save();
};

// Instance method to reset credits (monthly)
userSchema.methods.resetCredits = function() {
  const creditsToAdd = this.hasActiveSubscription ? 
    this.subscription.creditsIncluded : 50; // Free tier gets 50 credits
    
  this.credits.available = creditsToAdd;
  this.credits.used = 0;
  this.credits.total = creditsToAdd;
  this.credits.lastResetAt = new Date();
  
  return this.save();
};

// Static method to find user by API key
userSchema.statics.findByApiKey = function(apiKey) {
  return this.findOne({
    $or: [
      { apiKey, status: 'active' }, // Legacy field
      { 'apiKeys.key': apiKey, status: 'active' } // New array field
    ]
  }).select('+password');
};

// Static method to find user by session token
userSchema.statics.findBySessionToken = function(token) {
  return this.findOne({ 
    'sessions.token': token,
    'sessions.isActive': true,
    'sessions.expiresAt': { $gt: new Date() },
    status: 'active'
  });
};

// Create password reset token
userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
