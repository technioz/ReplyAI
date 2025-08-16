const mongoose = require('mongoose');
const { AppError } = require('../utils/AppError');

/**
 * MongoDB Database Configuration for Quirkly API Server
 * Handles connection, reconnection, and error handling with robust fallbacks
 */

let isConnected = false;
let connectionAttempts = 0;
const maxConnectionAttempts = 5;

const connectDatabase = async (retryCount = 0) => {
  if (isConnected) {
    console.log('📦 Using existing MongoDB connection');
    return;
  }

  if (retryCount >= maxConnectionAttempts) {
    console.error('❌ Max connection attempts reached. Server will start without database.');
    return;
  }

  try {
    // Define connection strategies in order of preference
    const connectionStrategies = [
      {
        name: 'Environment MongoDB URI',
        uri: process.env.MONGODB_URI,
        description: 'Custom MongoDB URI from environment'
      },
      {
        name: 'Local MongoDB',
        uri: 'mongodb://localhost:27017/quirkly',
        description: 'Local MongoDB instance'
      },
      {
        name: 'MongoDB Atlas Alternative',
        uri: 'mongodb+srv://technioztech:O8OCBzdf11RK1PJu@cluster1.mrxbaa5.mongodb.net/quirkly?retryWrites=true&w=majority',
        description: 'Alternative Atlas cluster (if exists)'
      }
    ];

    // Filter out undefined URIs and select strategy
    const availableStrategies = connectionStrategies.filter(strategy => strategy.uri);
    const currentStrategy = availableStrategies[retryCount] || availableStrategies[availableStrategies.length - 1];
    
    if (!currentStrategy) {
      throw new Error('No MongoDB connection strategies available');
    }

    console.log(`🔄 Attempt ${retryCount + 1}: ${currentStrategy.name}`);
    console.log(`📝 ${currentStrategy.description}`);

    const mongoUri = currentStrategy.uri;
    const dbName = process.env.MONGODB_DB_NAME || 'quirkly';

    // Configure connection options based on connection type
    const options = {
      dbName: dbName,
      maxPoolSize: 5,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      w: 'majority',
      bufferCommands: false,
      monitorCommands: process.env.NODE_ENV === 'development'
    };

    // Adjust options based on connection type
    if (mongoUri.includes('localhost')) {
      // Local MongoDB options
      Object.assign(options, {
        directConnection: true,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 10000
      });
      console.log('🏠 Using local MongoDB configuration');
    } else {
      // Remote MongoDB options
      Object.assign(options, {
        directConnection: false,
        serverSelectionTimeoutMS: 20000,
        connectTimeoutMS: 20000,
        socketTimeoutMS: 30000,
        family: 4, // Force IPv4
        ssl: true,
        authSource: 'admin'
      });
      console.log('☁️ Using remote MongoDB configuration');
    }

    console.log(`🔗 Connecting to MongoDB... (${retryCount + 1}/${maxConnectionAttempts})`);
    
    // Enable debug mode in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', true);
    }

    // Attempt connection with timeout
    const connectionPromise = mongoose.connect(mongoUri, options);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout')), 30000)
    );

    await Promise.race([connectionPromise, timeoutPromise]);

    isConnected = true;
    connectionAttempts = 0;
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${dbName}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Connection: ${currentStrategy.name}`);

  } catch (error) {
    connectionAttempts++;
    console.error(`❌ MongoDB connection error (Attempt ${retryCount + 1}):`, error.message);
    
    // Provide specific error guidance
    if (error.message.includes('ENOTFOUND') || error.message.includes('ETIMEOUT')) {
      console.log('💡 DNS/Network issue detected:');
      console.log('   1. Check internet connection');
      console.log('   2. Try different DNS servers');
      console.log('   3. Check if MongoDB cluster exists');
    } else if (error.message.includes('Authentication failed')) {
      console.log('💡 Authentication issue:');
      console.log('   1. Check username/password in connection string');
      console.log('   2. Verify database user permissions');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Connection refused:');
      console.log('   1. MongoDB service not running');
      console.log('   2. Wrong port or host');
    } else if (error.message.includes('Connection timeout')) {
      console.log('💡 Connection timeout:');
      console.log('   1. Network latency too high');
      console.log('   2. MongoDB server overloaded');
    } else {
      console.log('💡 Unknown error:', error.message);
    }
    
    isConnected = false;
    
    // Retry with exponential backoff
    if (retryCount < maxConnectionAttempts - 1) {
      const delay = Math.min(5000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
      console.log(`🔄 Retrying in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectDatabase(retryCount + 1);
    }
    
    // Final failure handling
    console.error('❌ All MongoDB connection attempts failed');
    
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️ Production mode: Server will start without database');
      console.log('💡 Check MongoDB Atlas status and connection strings');
    } else {
      console.log('💡 Development mode: Consider installing local MongoDB');
      console.log('   macOS: brew install mongodb-community');
      console.log('   Ubuntu: sudo apt install mongodb');
      console.log('   Windows: Download from mongodb.com');
    }
    
    return; // Don't exit, let server start without database
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
        readyState: mongoose.connection.readyState,
        connectionAttempts
      };
    }
    
    await mongoose.connection.db.admin().ping();
    return {
      status: 'healthy',
      connected: isConnected,
      readyState: mongoose.connection.readyState,
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      connectionAttempts
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message,
      readyState: mongoose.connection.readyState,
      connectionAttempts
    };
  }
};

// Database statistics
const getDatabaseStats = async () => {
  try {
    if (!mongoose.connection.db) {
      throw new Error('No database connection');
    }
    
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

// Test connection function - Simplified and more reliable
const testConnection = async () => {
  try {
    console.log('🧪 Testing MongoDB connection...');
    
    // Test local MongoDB first (most reliable for development)
    const localUri = 'mongodb://localhost:27017/quirkly';
    
    try {
      const testConnection = await mongoose.createConnection(localUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });
      
      await testConnection.close();
      console.log('✅ Local MongoDB is accessible');
      return true;
    } catch (localError) {
      console.log('❌ Local MongoDB not accessible:', localError.message);
    }
    
    // Test environment MongoDB URI if available
    if (process.env.MONGODB_URI) {
      try {
        const testConnection = await mongoose.createConnection(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 10000,
          connectTimeoutMS: 10000
        });
        
        await testConnection.close();
        console.log('✅ Environment MongoDB URI is accessible');
        return true;
      } catch (envError) {
        console.log('❌ Environment MongoDB URI not accessible:', envError.message);
      }
    }
    
    console.log('❌ No MongoDB connections available');
    return false;
    
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
  isConnected: () => isConnected,
  getConnectionAttempts: () => connectionAttempts
};