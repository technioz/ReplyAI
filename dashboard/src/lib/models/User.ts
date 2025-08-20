import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * User Model for Quirkly Next.js API
 * Handles user authentication, API keys, subscriptions, and credits
 */

// Session schema
const sessionSchema = new Schema({
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

// Subscription schema
const subscriptionSchema = new Schema({
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

// Usage schema
const usageSchema = new Schema({
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

// User interface
export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  apiKey?: string;
  apiKeys: Array<{
    key: string;
    name: string;
    createdAt: Date;
    lastUsedAt?: Date;
    isActive: boolean;
  }>;
  status: 'active' | 'inactive' | 'suspended';
  role: 'user' | 'admin';
  sessions: Array<{
    token: string;
    createdAt: Date;
    expiresAt: Date;
    userAgent: string;
    ipAddress: string;
    isActive: boolean;
  }>;
  loginAttempts: number;
  lockedUntil?: Date;
  lastLoginAt?: Date;
  lastLoginIP?: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  subscription?: {
    stripeSubscriptionId: string;
    stripePriceId: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    plan: string;
    creditsIncluded: number;
    createdAt: Date;
    updatedAt: Date;
  };
  credits: {
    available: number;
    used: number;
    total: number;
    lastResetAt: Date;
  };
  usage: Array<{
    date: Date;
    creditsUsed: number;
    repliesGenerated: number;
    month: string;
    year: number;
  }>;
  stripeCustomerId?: string;
  preferences: {
    defaultTone: string;
    notifications: {
      email: boolean;
      marketing: boolean;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  fullName: string;
  isLocked: boolean;
  hasActiveSubscription: boolean;
  
  // Instance methods
  correctPassword(candidatePassword: string): Promise<boolean>;
  generateApiKey(): string;
  createSessionToken(userAgent?: string, ipAddress?: string): string;
  invalidateSession(token: string): any;
  cleanExpiredSessions(): void;
  incLoginAttempts(): any;
  resetLoginAttempts(): any;
  useCredits(amount?: number): Promise<any>;
  resetCredits(): Promise<any>;
  createPasswordResetToken(): string;
}

// User Model interface with static methods
export interface IUserModel extends mongoose.Model<IUser> {
  findByApiKey(apiKey: string): Promise<IUser | null>;
  findBySessionToken(token: string): Promise<IUser | null>;
}

// User schema
const userSchema = new Schema<IUser>({
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
userSchema.virtual('fullName').get(function(this: IUser) {
  if (this.lastName && this.lastName.trim()) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.firstName;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function(this: IUser) {
  return !!(this.lockedUntil && this.lockedUntil > new Date());
});

// Virtual for subscription status
userSchema.virtual('hasActiveSubscription').get(function(this: IUser) {
  return this.subscription && 
         this.subscription.status === 'active' && 
         this.subscription.currentPeriodEnd > new Date();
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(this: IUser, next) {
  // Only run if password was modified
  if (!this.isModified('password')) return next();
  
  // Hash password with cost of 12
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
  this.password = await bcrypt.hash(this.password, saltRounds);
  
  next();
});

// Pre-save middleware to update timestamps
userSchema.pre('save', function(this: IUser, next) {
  this.updatedAt = new Date();
  next();
});

// Instance method to check password
userSchema.methods.correctPassword = async function(this: IUser, candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate API key
userSchema.methods.generateApiKey = function(this: IUser): string {
  const prefix = 'qk_';
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const timestamp = Date.now().toString(36);
  this.apiKey = `${prefix}${timestamp}_${randomBytes}`;
  return this.apiKey;
};

// Instance method to create session token
userSchema.methods.createSessionToken = function(this: IUser, userAgent: string = 'unknown', ipAddress: string = 'unknown'): string {
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
userSchema.methods.invalidateSession = function(this: IUser, token: string) {
  const session = this.sessions.find(s => s.token === token);
  if (session) {
    session.isActive = false;
  }
  return session;
};

// Instance method to clean expired sessions
userSchema.methods.cleanExpiredSessions = function(this: IUser) {
  const now = new Date();
  this.sessions = this.sessions.filter(session => 
    session.expiresAt > now && session.isActive
  );
};

// Instance method to handle failed login
userSchema.methods.incLoginAttempts = function(this: IUser) {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockedUntil && this.lockedUntil < new Date()) {
    return this.updateOne({
      $unset: {
        lockedUntil: 1
      },
      $set: {
        loginAttempts: 1
      }
    });
  }
  
  const updates: any = { $inc: { loginAttempts: 1 } };
  
  // If we have hit max attempts and it's not locked, lock account
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000; // 2 hours
  
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockedUntil: Date.now() + lockTime };
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function(this: IUser) {
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
userSchema.methods.useCredits = function(this: IUser, amount: number = 1) {
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
userSchema.methods.resetCredits = function(this: IUser) {
  const creditsToAdd = this.hasActiveSubscription ? 
    this.subscription!.creditsIncluded : 50; // Free tier gets 50 credits
    
  this.credits.available = creditsToAdd;
  this.credits.used = 0;
  this.credits.total = creditsToAdd;
  this.credits.lastResetAt = new Date();
  
  return this.save();
};

// Create password reset token
userSchema.methods.createPasswordResetToken = function(this: IUser): string {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  return resetToken;
};

// Static method to find user by API key
userSchema.statics.findByApiKey = function(apiKey: string) {
  return this.findOne({
    $or: [
      { apiKey, status: 'active' }, // Legacy field
      { 'apiKeys.key': apiKey, status: 'active' } // New array field
    ]
  }).select('+password');
};

// Static method to find user by session token
userSchema.statics.findBySessionToken = function(token: string) {
  console.log('🔍 findBySessionToken called with token:', token ? `${token.substring(0, 10)}...` : 'none');
  
  const query = { 
    'sessions.token': token,
    'sessions.isActive': true,
    'sessions.expiresAt': { $gt: new Date() },
    status: 'active'
  };
  
  console.log('🔍 findBySessionToken query:', JSON.stringify(query, null, 2));
  
  return this.findOne(query).then(user => {
    if (user) {
      console.log('✅ findBySessionToken found user:', user.email);
      console.log('🔍 User sessions count:', user.sessions.length);
      console.log('🔍 Active sessions:', user.sessions.filter(s => s.isActive && s.expiresAt > new Date()).length);
    } else {
      console.log('❌ findBySessionToken no user found');
    }
    return user;
  });
};

// Create and export the model
const User = mongoose.models.User || mongoose.model<IUser, IUserModel>('User', userSchema);

export default User;
