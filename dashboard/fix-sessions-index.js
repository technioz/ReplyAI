/**
 * Fix MongoDB sessions.token index issue
 * This script drops the problematic unique index on sessions.token
 */

const mongoose = require('mongoose');
const fs = require('fs');

// Read .env.local file manually
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

async function fixSessionsIndex() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME || 'quirkly'
    });
    
    console.log('✅ Connected to MongoDB');
    console.log('📊 Database:', process.env.MONGODB_DB_NAME || 'quirkly');
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // List all indexes
    console.log('\n📋 Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log('  -', index.name, ':', JSON.stringify(index.key));
    });
    
    // Drop the problematic sessions.token index if it exists
    try {
      console.log('\n🗑️  Dropping sessions.token_1 index...');
      await collection.dropIndex('sessions.token_1');
      console.log('✅ Index dropped successfully!');
    } catch (error) {
      if (error.code === 27 || error.message.includes('index not found')) {
        console.log('ℹ️  Index sessions.token_1 does not exist (already removed)');
      } else {
        throw error;
      }
    }
    
    // List indexes after deletion
    console.log('\n📋 Indexes after cleanup:');
    const updatedIndexes = await collection.indexes();
    updatedIndexes.forEach(index => {
      console.log('  -', index.name, ':', JSON.stringify(index.key));
    });
    
    console.log('\n✅ Fix complete! You can now create users without sessions.');
    console.log('💡 Signup should now work correctly.');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixSessionsIndex();

