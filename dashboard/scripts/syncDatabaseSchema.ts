#!/usr/bin/env tsx
/**
 * Apply Mongoose schema indexes to MongoDB (creates `users` collection if missing).
 * Uses dashboard/.env.local — same MONGODB_URI / MONGODB_DB_NAME as the Next app.
 */

import { config } from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import User from '../src/lib/models/User';

async function main() {
  config({ path: path.join(__dirname, '../.env.local') });

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Add it to dashboard/.env.local');
    process.exit(1);
  }

  const dbName = process.env.MONGODB_DB_NAME || 'quirkly';
  console.log('Connecting to MongoDB…');
  console.log('Database name:', dbName);

  await mongoose.connect(process.env.MONGODB_URI, {
    bufferCommands: false,
    dbName
  });

  console.log('Syncing indexes for model User → collection', User.collection.name, '…');
  await User.syncIndexes();

  const indexes = await User.collection.indexes();
  console.log('\nIndexes on', User.collection.name + ':');
  for (const idx of indexes) {
    console.log(' ', idx.name, JSON.stringify(idx.key));
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
