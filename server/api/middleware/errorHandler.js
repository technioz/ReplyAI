const { AppError } = require('../utils/AppError');

/**
 * Global error handling middleware for Quirkly API Server
 * Handles all errors and sends appropriate responses to clients
 */

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'INVALID_DATA');
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg ? err.errmsg.match(/(["'])(\\?.)*?\1/)[0] : 'duplicate value';
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 409, 'DUPLICATE_FIELD');
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400, 'VALIDATION_ERROR');
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401, 'INVALID_TOKEN');

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401, 'TOKEN_EXPIRED');

const handleMongoError = (err) => {
  let message = 'Database operation failed';
  let statusCode = 500;
  let errorCode = 'DATABASE_ERROR';

  // Handle specific MongoDB errors
  if (err.code === 11000) {
    return handleDuplicateFieldsDB(err);
  }

  if (err.name === 'ValidationError') {
    return handleValidationErrorDB(err);
  }

  if (err.name === 'CastError') {
    return handleCastErrorDB(err);
  }

  // Connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    message = 'Database connection failed. Please try again later.';
    statusCode = 503;
    errorCode = 'DATABASE_UNAVAILABLE';
  }

  // Server selection errors
  if (err.name === 'MongoServerSelectionError') {
    message = 'Database server unavailable. Please try again later.';
    statusCode = 503;
    errorCode = 'DATABASE_UNAVAILABLE';
  }

  return new AppError(message, statusCode, errorCode);
};

const handleStripeError = (err) => {
  let message = 'Payment processing failed';
  let statusCode = 400;
  let errorCode = 'PAYMENT_ERROR';

  switch (err.type) {
    case 'StripeCardError':
      message = err.message || 'Your card was declined.';
      statusCode = 402;
      errorCode = 'CARD_DECLINED';
      break;
    case 'StripeRateLimitError':
      message = 'Too many requests made to Stripe API too quickly';
      statusCode = 429;
      errorCode = 'RATE_LIMIT_EXCEEDED';
      break;
    case 'StripeInvalidRequestError':
      message = 'Invalid parameters were supplied to Stripe API';
      statusCode = 400;
      errorCode = 'INVALID_PAYMENT_REQUEST';
      break;
    case 'StripeAPIError':
      message = 'An error occurred with Stripe API';
      statusCode = 502;
      errorCode = 'PAYMENT_SERVICE_ERROR';
      break;
    case 'StripeConnectionError':
      message = 'A network error occurred while connecting to Stripe';
      statusCode = 503;
      errorCode = 'PAYMENT_SERVICE_UNAVAILABLE';
      break;
    case 'StripeAuthenticationError':
      message = 'Authentication with Stripe API failed';
      statusCode = 401;
      errorCode = 'PAYMENT_AUTH_ERROR';
      break;
    default:
      message = err.message || 'Payment processing failed';
  }

  return new AppError(message, statusCode, errorCode);
};

const sendErrorDev = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/webhook')) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.errorCode || 'INTERNAL_SERVER_ERROR',
      message: err.message,
      stack: err.stack,
      details: err.details || null,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  }

  // RENDERED WEBSITE
  res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message
  });
};

const sendErrorProd = (err, req, res) => {
  // API
  if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/webhook')) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        success: false,
        error: err.errorCode || 'OPERATION_FAILED',
        message: err.message,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || null
      });
    }

    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong on our end. Please try again later.',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || null
    });
  }

  // RENDERED WEBSITE
  // A) Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message
    });
  }

  // B) Programming or other unknown error: don't leak error details
  console.error('ERROR 💥', err);
  res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.'
  });
};

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error details
  console.error('Error caught by global handler:', {
    name: err.name,
    message: err.message,
    statusCode: err.statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    
    // Handle MongoDB errors
    if (error.name && error.name.startsWith('Mongo')) {
      error = handleMongoError(error);
    }

    // Handle Stripe errors
    if (error.type && error.type.startsWith('Stripe')) {
      error = handleStripeError(error);
    }

    sendErrorProd(error, req, res);
  }
};

// Async error wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = {
  errorHandler,
  catchAsync,
  AppError
};
