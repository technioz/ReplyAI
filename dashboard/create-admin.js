const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Import User model
const User = require('./src/lib/models/User');

async function createAdminUser() {
  try {
    // Connect to database
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB_NAME || 'quirkly'
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists:', existingAdmin.email);
      console.log('📧 Email:', existingAdmin.email);
      console.log('🔑 Password: (use the password you set when creating this user)');
      process.exit(0);
    }

    // Create admin user
    const adminData = {
      email: 'admin@quirkly.app',
      password: 'Admin123!@#',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      status: 'active',
      credits: {
        available: 10000,
        used: 0,
        total: 10000,
        lastResetAt: new Date()
      },
      preferences: {
        defaultTone: 'professional',
        notifications: {
          email: true,
          marketing: false
        }
      }
    };

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');
    const hashedPassword = await bcrypt.hash(adminData.password, saltRounds);

    // Create user
    const adminUser = new User({
      ...adminData,
      password: hashedPassword
    });

    // Generate API key
    adminUser.generateApiKey();

    // Save user
    await adminUser.save();

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Password:', adminData.password);
    console.log('🔑 API Key:', adminUser.apiKey);
    console.log('👑 Role: Admin');
    console.log('💳 Credits: 10,000');

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
