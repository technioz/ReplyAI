import mongoose from 'mongoose';
import dns from 'dns';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

type MongooseConnectionState = typeof mongoose.connection.readyState;

let cached = (global as any)._mongooseCache as
  | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
  | undefined;

if (!cached) {
  cached = { conn: null, promise: null };
  (global as any)._mongooseCache = cached;
}

export const connectDatabase = async (): Promise<typeof mongoose> => {
  // If we have a cached connection, verify it's still alive
  if (cached.conn) {
    if (mongoose.connection.readyState === 1) {
      return cached.conn;
    }
    // Connection was lost, reset and reconnect
    console.log('🔄 MongoDB connection lost, reconnecting...');
    cached.conn = null;
    cached.promise = null;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined. Add it to your environment configuration.');
  }

  if (!cached.promise) {
    const options = {
      bufferCommands: false,
      dbName: process.env.MONGODB_DB_NAME || 'quirkly'
    } satisfies mongoose.ConnectOptions;

    console.log('🔄 Connecting to MongoDB...');
    console.log('📊 Database:', options.dbName);

    cached.promise = mongoose.connect(process.env.MONGODB_URI, options)
      .then((mongoose) => {
        console.log('✅ MongoDB connected successfully');
        return mongoose;
      })
      .catch((error) => {
        console.error('❌ MongoDB connection failed:', error);
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    throw error;
  }

  return cached.conn;
};

// Handle connection events for robustness
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
  cached.conn = null;
  cached.promise = null;
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
  cached.conn = null;
  cached.promise = null;
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

export const checkDatabaseHealth = async (): Promise<boolean> => {
  const state: MongooseConnectionState = mongoose.connection.readyState;
  if (state !== 1) {
    return false;
  }

  try {
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
};

export default connectDatabase;