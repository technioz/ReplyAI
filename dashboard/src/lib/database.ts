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
  if (cached.conn) {
    return cached.conn;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined. Add it to your environment configuration.');
  }

  if (!cached.promise) {
    // Connection options with database name
    const options = {
      bufferCommands: false,
      dbName: process.env.MONGODB_DB_NAME || 'quirkly'
    } satisfies mongoose.ConnectOptions;

    console.log('🔄 Connecting to MongoDB...');
    console.log('📊 Database:', options.dbName);
    console.log('📊 URI:', process.env.MONGODB_URI);

    cached.promise = mongoose.connect(process.env.MONGODB_URI, options);
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

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
