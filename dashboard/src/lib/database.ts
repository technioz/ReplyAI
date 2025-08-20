import mongoose from 'mongoose';

let isConnected = false;
let connectionAttempts = 0;
const maxConnectionAttempts = 5;

const connectDatabase = async (retryCount = 0): Promise<void> => {
  if (isConnected) {
    console.log('📦 Using existing MongoDB connection');
    return;
  }

  if (retryCount >= maxConnectionAttempts) {
    console.error('❌ Max connection attempts reached. Server will start without database.');
    return;
  }

  try {
    let uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
    }

    // Fix the connection string format
    if (uri.includes('mongodb+srv://')) {
      // Keep mongodb+srv format but fix the hostname resolution
      // Add retryWrites and w=majority as query parameters
      if (!uri.includes('?')) {
        uri += '?retryWrites=true&w=majority';
      } else {
        uri += '&retryWrites=true&w=majority';
      }
    }

    console.log(`🔄 Attempt ${retryCount + 1}: Connecting to MongoDB...`);
    console.log(`🔗 URI: ${uri.substring(0, 50)}...`);

    // Try to parse the URI to check for issues
    try {
      new URL(uri);
      console.log('✅ URI format is valid');
    } catch (uriError) {
      console.error('❌ Invalid URI format:', uriError);
      throw new Error('Invalid MongoDB URI format');
    }

    const options = {
      dbName: process.env.MONGODB_DB_NAME || 'quirkly',
      maxPoolSize: 5,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      w: 'majority' as const,
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 20000,
      family: 4, // Force IPv4
      ssl: true,
      authSource: 'admin',
      // Remove problematic options
      directConnection: false,
      maxConnecting: 2,
      heartbeatFrequencyMS: 10000
    };

    await mongoose.connect(uri, options);

    isConnected = true;
    connectionAttempts = 0;
    
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${options.dbName}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);

  } catch (error) {
    connectionAttempts++;
    console.error(`❌ MongoDB connection error (Attempt ${retryCount + 1}):`, error instanceof Error ? error.message : 'Unknown error');
    
    isConnected = false;
    
    // Try fallback connection methods on the last attempt
    if (retryCount === maxConnectionAttempts - 1) {
      console.log('🔄 Trying fallback connection methods...');
      try {
        await connectWithFallback();
        isConnected = true;
        connectionAttempts = 0;
        console.log('✅ MongoDB connected successfully using fallback method');
        console.log(`📊 Database: ${process.env.MONGODB_DB_NAME || 'quirkly'}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
        return;
      } catch (fallbackError) {
        console.error('❌ All fallback connection methods failed:', fallbackError instanceof Error ? fallbackError.message : 'Unknown error');
      }
    }
    
    // Retry with exponential backoff
    if (retryCount < maxConnectionAttempts - 1) {
      const delay = Math.min(5000 * Math.pow(2, retryCount), 30000); // Max 30 seconds
      console.log(`🔄 Retrying in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectDatabase(retryCount + 1);
    }
    
    console.error('❌ All MongoDB connection attempts failed');
    throw error;
  }
};

// Fallback connection method
const connectWithFallback = async (): Promise<void> => {
  const connectionMethods = [
    // Method 1: Standard mongodb+srv connection
    async () => {
      let uri = process.env.MONGODB_URI || '';
      if (!uri.includes('?')) {
        uri += '?retryWrites=true&w=majority&maxPoolSize=3&serverSelectionTimeoutMS=8000';
      } else {
        uri += '&retryWrites=true&w=majority&maxPoolSize=3&serverSelectionTimeoutMS=8000';
      }
      
      const options = {
        dbName: process.env.MONGODB_DB_NAME || 'quirkly',
        maxPoolSize: 3,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        socketTimeoutMS: 15000,
        family: 4,
        ssl: true,
        authSource: 'admin'
      };
      
      await mongoose.connect(uri, options);
    },
    
    // Method 2: Connection with different timeout settings
    async () => {
      let uri = process.env.MONGODB_URI || '';
      if (!uri.includes('?')) {
        uri += '?retryWrites=true&w=majority&maxPoolSize=1&serverSelectionTimeoutMS=15000';
      } else {
        uri += '&retryWrites=true&w=majority&maxPoolSize=1&serverSelectionTimeoutMS=15000';
      }
      
      const options = {
        dbName: process.env.MONGODB_DB_NAME || 'quirkly',
        maxPoolSize: 1,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 20000,
        family: 4,
        ssl: true,
        authSource: 'admin'
      };
      
      await mongoose.connect(uri, options);
    },
    
    // Method 3: Minimal connection with longer timeouts
    async () => {
      let uri = process.env.MONGODB_URI || '';
      if (!uri.includes('?')) {
        uri += '?retryWrites=true&w=majority&maxPoolSize=1';
      } else {
        uri += '&retryWrites=true&w=majority&maxPoolSize=1';
      }
      
      const options = {
        dbName: process.env.MONGODB_DB_NAME || 'quirkly',
        maxPoolSize: 1,
        serverSelectionTimeoutMS: 20000,
        connectTimeoutMS: 20000,
        socketTimeoutMS: 30000
      };
      
      await mongoose.connect(uri, options);
    }
  ];
  
  for (let i = 0; i < connectionMethods.length; i++) {
    try {
      console.log(`🔄 Trying connection method ${i + 1}...`);
      await connectionMethods[i]();
      console.log(`✅ Connection method ${i + 1} successful!`);
      return;
    } catch (error) {
      console.log(`❌ Connection method ${i + 1} failed:`, error instanceof Error ? error.message : 'Unknown error');
      if (i === connectionMethods.length - 1) {
        throw error; // Re-throw if all methods failed
      }
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

// Graceful shutdown
const gracefulShutdown = (msg: string, callback: () => void) => {
  mongoose.connection.close().then(() => {
    console.log(`📦 Mongoose disconnected through ${msg}`);
    callback();
  });
};

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
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    if (!isConnected) {
      return false;
    }
    
    // Ping the database
    await mongoose.connection.db.admin().ping();
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    isConnected = false;
    return false;
  }
};

// Export the connect function
export default connectDatabase;

// Export the fallback method
export { connectWithFallback };
