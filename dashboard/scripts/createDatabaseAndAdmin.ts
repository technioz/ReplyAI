#!/usr/bin/env tsx
/**
 * Ensures the database named by MONGODB_DB_NAME exists (MongoDB creates it on first write)
 * and creates or resets the admin user. Loads dashboard/.env.local like the Next app.
 *
 * Optional env: ADMIN_EMAIL (default admin@quirkly.app), ADMIN_PASSWORD (default Admin123!@#)
 */

import { config } from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import User from '../src/lib/models/User';

function enterpriseSubscription() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return {
    stripeSubscriptionId: 'admin-enterprise-subscription',
    stripePriceId: 'admin-enterprise-price',
    status: 'active' as const,
    currentPeriodStart: now,
    currentPeriodEnd: nextMonth,
    cancelAtPeriodEnd: false,
    plan: 'enterprise' as const,
    creditsIncluded: 20000,
    createdAt: now,
    updatedAt: now,
  };
}

async function main() {
  config({ path: path.join(__dirname, '../.env.local') });

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Add it to dashboard/.env.local');
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB_NAME || 'quirkly';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@quirkly.app';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!@#';

  console.log('Connecting to MongoDB…');
  console.log('Database name:', dbName, '(created automatically on first write)');

  await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false,
    dbName,
  });

  console.log('Connected. Active db:', mongoose.connection.db?.databaseName);

  await User.syncIndexes();
  console.log('User indexes synced.');

  let existing = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });

  if (existing) {
    console.log('Found existing admin:', existing.email, '— resetting password and credits.');
    existing.password = adminPassword;
    existing.markModified('password');
    existing.subscription = enterpriseSubscription();
    existing.credits = {
      available: 20000,
      used: 0,
      total: 20000,
      lastResetAt: new Date(),
    };
    existing.emailVerified = true;
    existing.status = 'active';
    existing.generateApiKey();
    await existing.save();
    console.log('Email:', existing.email);
    console.log('Password:', adminPassword);
    console.log('API key:', existing.apiKey);
  } else {
    const now = new Date();
    const user = new User({
      email: adminEmail.toLowerCase(),
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      status: 'active',
      subscription: enterpriseSubscription(),
      credits: {
        available: 20000,
        used: 0,
        total: 20000,
        lastResetAt: now,
      },
      usage: [],
      preferences: {
        defaultTone: 'professional',
        notifications: { email: true, marketing: false },
      },
      emailVerified: true,
    });
    user.generateApiKey();
    await user.save();
    console.log('Created admin.');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('API key:', user.apiKey);
  }

  console.log('\nChange the password after first login if this is production.');
  await mongoose.disconnect();
  console.log('Disconnected.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
