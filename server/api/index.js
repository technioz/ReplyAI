const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
require('express-async-errors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const subscriptionRoutes = require('./routes/subscription');
const creditsRoutes = require('./routes/credits');
const replyRoutes = require('./routes/reply');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { connectDatabase, testConnection } = require('./config/database');
const { validateApiKey } = require('./middleware/auth');

const app = express();

// Test and connect to MongoDB
const initializeDatabase = async () => {
  try {
    // Test connection first
    await testConnection();
    
    // Then attempt to connect
    await connectDatabase();
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Continuing in development mode without database...');
    } else {
      process.exit(1);
    }
  }
};

// Start database initialization but don't wait for it
initializeDatabase().catch(error => {
  console.error('❌ Database initialization error:', error.message);
});

// Trust proxy for Vercel
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // In development mode, allow all origins
    if (isDevelopment) {
      console.log(`🌐 CORS [DEV]: Allowing origin: ${origin || 'no-origin'}`);
      return callback(null, true);
    }
    
    // In production, use strict CORS
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(o => o.length > 0);
    
    // Default production origins if none specified
    if (allowedOrigins.length === 0) {
      allowedOrigins.push(
        'https://quirkly.technioz.com',
        'https://dashboard.quirkly.com',
        'chrome-extension://'
      );
    }
    
    // Check if origin is allowed or starts with chrome-extension://
    const isAllowed = allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin || 
      (allowedOrigin.startsWith('chrome-extension://') && origin.startsWith('chrome-extension://'))
    );
    
    if (isAllowed) {
      console.log(`🌐 CORS [PROD]: Allowed origin: ${origin}`);
      callback(null, true);
    } else {
      console.log(`❌ CORS [PROD]: Blocked origin: ${origin}`);
      console.log(`📋 CORS [PROD]: Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const { checkDatabaseHealth } = require('./config/database');
    const dbHealth = await checkDatabaseHealth();
    
    res.status(200).json({
      success: true,
      message: 'Quirkly API Server is healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: '1.0.0',
      database: dbHealth
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      message: 'Quirkly API Server is healthy (database status unknown)',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      version: '1.0.0',
      database: {
        status: 'unknown',
        error: error.message
      }
    });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Quirkly API Server is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/reply', replyRoutes);

// Legacy routes for backward compatibility
app.use('/webhook/quirkly-auth', authRoutes);
app.use('/webhook-test/quirkly-auth', authRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Quirkly API Server',
    version: '1.0.0',
    documentation: `${process.env.DOMAIN_URL}/api/docs`,
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      user: '/api/user',
      subscription: '/api/subscription',
      credits: '/api/credits',
      reply: '/api/reply'
    }
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Quirkly API Server',
    version: '1.0.0',
    documentation: `${process.env.DOMAIN_URL}/api/docs`,
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      user: '/api/user',
      subscription: '/api/subscription',
      credits: '/api/credits',
      reply: '/api/reply'
    }
  });
});

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'ROUTE_NOT_FOUND',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/api/auth',
      '/api/user',
      '/api/subscription',
      '/api/credits',
      '/api/reply',
      '/health'
    ]
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  console.error(err.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`🚀 Quirkly API Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});

module.exports = app;
