const mongoose = require('mongoose');
const { AppError } = require('../utils/AppError');

/**
 * MongoDB Database Configuration for Quirkly API Server
 * Handles connection, reconnection, and error handling
 */

let isConnected = false;

const connectDatabase = async (retryCount = 0) => {
  if (isConnected) {
    console.log('📦 Using existing MongoDB connection');
    return;
  }

  const maxRetries = 3;
  const retryDelay = 5000; // 5 seconds

  try {
    let mongoUri = process.env.MONGODB_URI || 'mongodb+srv://technioztech:O8OCBzdf11RK1PJu@cluster0.mrxbaa5.mongodb.net/quirkly';
    const dbName = process.env.MONGODB_DB_NAME || 'quirkly';

    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    // Try alternative connection string format if the main one fails
    if (retryCount > 0 && mongoUri.includes('mongodb+srv://')) {
      const fallbackUri = mongoUri.replace('mongodb+srv://', 'mongodb://');
      console.log('🔄 Trying fallback connection string...');
      mongoUri = fallbackUri;
    }

    // Try local MongoDB as last resort in development
    if (retryCount === maxRetries && process.env.NODE_ENV === 'development') {
      console.log('🔄 Trying local MongoDB as fallback...');
      mongoUri = 'mongodb://localhost:27017/quirkly';
    }

    console.log(`🔄 Connecting to MongoDB... (Attempt ${retryCount + 1}/${maxRetries + 1})`);

    const options = {
      dbName: dbName,
      maxPoolSize: 10, // Maximum number of connections in the connection pool
      serverSelectionTimeoutMS: 30000, // Increased timeout for server selection
      socketTimeoutMS: 45000, // How long to wait for a response
      connectTimeoutMS: 30000, // Connection timeout
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: true,
      w: 'majority',
      // Connection monitoring
      monitorCommands: process.env.NODE_ENV === 'development',
      // Retry logic
      retryReads: true,
      // DNS resolution
      directConnection: false,
      // Connection pooling
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      // Add connection stability options
      heartbeatFrequencyMS: 10000,
      serverApi: {
        version: '1',
        strict: false,
        deprecationErrors: false,
      },
      // Better timeout handling
      maxStalenessSeconds: 90,
      readPreference: 'primaryPreferred',
    };

    // Connect to MongoDB
    await mongoose.connect(mongoUri, options);

    isConnected = true;
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${dbName}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);

  } catch (error) {
    console.error(`❌ MongoDB connection error (Attempt ${retryCount + 1}):`, error.message);
    isConnected = false;
    
    // Retry logic
    if (retryCount < maxRetries) {
      console.log(`🔄 Retrying in ${retryDelay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return connectDatabase(retryCount + 1);
    }
    
    // In serverless environments, don't exit the process
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
      throw new AppError('Database connection failed', 503, 'DATABASE_UNAVAILABLE');
    } else if (process.env.NODE_ENV === 'development') {
      console.error('❌ Max retries reached. Continuing without database in development mode...');
      // Don't exit in development, let the server start without database
      return;
    } else {
      console.error('❌ Max retries reached. Exiting...');
      process.exit(1);
    }
  }
};

// Connection event listeners
mongoose.connection.on('connected', () => {
  console.log('📦 Mongoose connected to MongoDB');
  isConnected = true;
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
  isConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.log('📦 Mongoose disconnected from MongoDB');
  isConnected = false;
});

// Add connection pool monitoring
mongoose.connection.on('connected', () => {
  if (mongoose.connection.pool) {
    const poolSize = mongoose.connection.pool.size;
    const available = mongoose.connection.pool.available;
    console.log(`📊 Connection pool: ${available}/${poolSize} connections available`);
    
    // Monitor connection pool events
    mongoose.connection.pool.on('connectionCreated', () => {
      console.log('🔗 New connection created in pool');
    });

    mongoose.connection.pool.on('connectionClosed', () => {
      console.log('🔗 Connection closed from pool');
    });
  }
});

// Graceful shutdown
const gracefulShutdown = (msg, callback) => {
  mongoose.connection.close(() => {
    console.log(`📦 Mongoose disconnected through ${msg}`);
    callback();
  });
};

// For app termination
process.once('SIGUSR2', () => {
  gracefulShutdown('nodemon restart', () => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

// For app termination
process.on('SIGINT', () => {
  gracefulShutdown('app termination', () => {
    process.exit(0);
  });
});

// For Heroku app termination
process.on('SIGTERM', () => {
  gracefulShutdown('Heroku app shutdown', () => {
    process.exit(0);
  });
});

// Health check function
const checkDatabaseHealth = async () => {
  try {
    if (!mongoose.connection.db) {
      return {
        status: 'unhealthy',
        connected: false,
        error: 'No database connection',
        readyState: mongoose.connection.readyState
      };
    }
    
    await mongoose.connection.db.admin().ping();
    return {
      status: 'healthy',
      connected: isConnected,
      readyState: mongoose.connection.readyState,
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message,
      readyState: mongoose.connection.readyState
    };
  }
};

// Database statistics
const getDatabaseStats = async () => {
  try {
    const stats = await mongoose.connection.db.stats();
    return {
      collections: stats.collections,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexes: stats.indexes,
      indexSize: stats.indexSize,
      objects: stats.objects
    };
  } catch (error) {
    throw new AppError('Failed to get database statistics', 500, 'DATABASE_STATS_ERROR');
  }
};

// Test connection function
const testConnection = async () => {
  try {
    console.log('🧪 Testing MongoDB connection...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://technioztech:O8OCBzdf11RK1PJu@cluster0.mrxbaa5.mongodb.net/quirkly';
    
    // Test DNS resolution
    const url = new URL(mongoUri);
    console.log(`🔍 Testing DNS resolution for: ${url.hostname}`);
    
    // Test basic connectivity
    const { exec } = require('child_process');
    const pingCommand = process.platform === 'win32' ? `ping -n 1 ${url.hostname}` : `ping -c 1 ${url.hostname}`;
    
    return new Promise((resolve, reject) => {
      exec(pingCommand, (error, stdout, stderr) => {
        if (error) {
          console.log(`❌ Ping test failed: ${error.message}`);
          resolve(false);
        } else {
          console.log(`✅ Ping test successful`);
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.log(`❌ Connection test failed: ${error.message}`);
    return false;
  }
};

module.exports = {
  connectDatabase,
  checkDatabaseHealth,
  getDatabaseStats,
  testConnection,
  isConnected: () => isConnected
};
