const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

// Simple env loader without dotenv dependency
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
}

loadEnv();

// Subscription schema
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

// Usage schema
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

// Define User schema directly
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
  subscription: subscriptionSchema,
  credits: {
    available: { type: Number, default: 20000 }, // Enterprise plan credits
    used: { type: Number, default: 0 },
    total: { type: Number, default: 20000 },
    lastResetAt: { type: Date, default: Date.now }
  },
  usage: [usageSchema],
  preferences: {
    defaultTone: { type: String, default: 'professional' },
    notifications: {
      email: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false }
    }
  },
  apiKey: { type: String, unique: true },
  stripeCustomerId: { type: String },
  emailVerified: { type: Boolean, default: true }, // Admin email is pre-verified
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only run if password was modified
  if (!this.isModified('password')) return next();
  
  // Hash password with cost of 12
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
  this.password = await bcrypt.hash(this.password, saltRounds);
  
  next();
});

// Add methods
userSchema.methods.generateApiKey = function() {
  this.apiKey = 'xai-' + require('crypto').randomBytes(32).toString('hex');
  return this.apiKey;
};

// Check if model already exists to avoid OverwriteModelError
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    // Connect to database
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    console.log('📊 Database:', process.env.MONGODB_DB_NAME || 'quirkly');
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('📊 MONGODB_URI:', process.env.MONGODB_URI)

    await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB_NAME || 'quirkly'
    });
    console.log('✅ Connected to MongoDB');
  
    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' }).select('+password');
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists:', existingAdmin.email);
      console.log('🔄 Resetting admin user with new password...');
      console.log('📝 Old password (first 20 chars):', existingAdmin.password?.substring(0, 20) + '...');
      
      // Update existing admin with new password
      // NOTE: Don't manually hash - the User model pre-save hook handles hashing
      existingAdmin.password = 'Admin123!@#';
      // Force mark password as modified to trigger pre-save hook
      existingAdmin.markModified('password');
      console.log('🔍 Password marked as modified:', existingAdmin.isModified('password'));
      
      // Set enterprise subscription
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      
      existingAdmin.subscription = {
        stripeSubscriptionId: 'admin-enterprise-subscription',
        stripePriceId: 'admin-enterprise-price',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
        cancelAtPeriodEnd: false,
        plan: 'enterprise',
        creditsIncluded: 20000,
        createdAt: now,
        updatedAt: now
      };
      
      existingAdmin.credits = {
        available: 20000,
        used: 0,
        total: 20000,
        lastResetAt: now
      };
      
      existingAdmin.emailVerified = true;
      existingAdmin.generateApiKey();
      
      console.log('💾 Saving user...');
      await existingAdmin.save();
      
      // Verify the password was hashed
      const verifyUser = await User.findOne({ email: existingAdmin.email }).select('+password');
      console.log('✔️ Saved password (first 20 chars):', verifyUser.password?.substring(0, 20) + '...');
      
      console.log('✅ Admin user updated successfully!');
      console.log('📧 Email:', existingAdmin.email);
      console.log('🔑 Password: Admin123!@#');
      console.log('🔑 API Key:', existingAdmin.apiKey);
      console.log('👑 Role: Admin');
      console.log('💳 Credits: 20,000 (Enterprise Plan)');
      console.log('🏢 Plan: Enterprise');
      console.log('✨ Benefits:');
      console.log('   • 20,000 AI replies per month');
      console.log('   • All tone variations');
      console.log('   • 24/7 support');
      console.log('   • Advanced analytics');
      console.log('   • Custom integrations');
      console.log('   • Email verified');
      console.log('\n⚠️ IMPORTANT: Change the password after first login!');
      console.log('🔗 Login at: http://localhost:3000/login');
      process.exit(0);
    }

    // Create admin user with enterprise subscription
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    
    const adminData = {
      email: 'admin@quirkly.app',
      password: 'Admin123!@#', // Don't manually hash - the User model pre-save hook handles hashing
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      status: 'active',
      subscription: {
        stripeSubscriptionId: 'admin-enterprise-subscription',
        stripePriceId: 'admin-enterprise-price',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: nextMonth,
        cancelAtPeriodEnd: false,
        plan: 'enterprise',
        creditsIncluded: 20000,
        createdAt: now,
        updatedAt: now
      },
      credits: {
        available: 20000,
        used: 0,
        total: 20000,
        lastResetAt: now
      },
      usage: [],
      preferences: {
        defaultTone: 'professional',
        notifications: {
          email: true,
          marketing: false
        }
      },
      emailVerified: true
    };

    // Create user (password will be auto-hashed by pre-save hook)
    const adminUser = new User(adminData);

    // Generate API key
    adminUser.generateApiKey();

    // Save user
    await adminUser.save();

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Password:', adminData.password);
    console.log('🔑 API Key:', adminUser.apiKey);
    console.log('👑 Role: Admin');
    console.log('💳 Credits: 20,000 (Enterprise Plan)');
    console.log('🏢 Plan: Enterprise');
    console.log('✨ Benefits:');
    console.log('   • 20,000 AI replies per month');
    console.log('   • All tone variations');
    console.log('   • 24/7 support');
    console.log('   • Advanced analytics');
    console.log('   • Custom integrations');
    console.log('   • Email verified');

    console.log('\n⚠️ IMPORTANT: Change the password after first login!');
    console.log('🔗 Login at: http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
  }
}

// Run the script
createAdminUser();
