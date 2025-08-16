/**
 * Custom Application Error class for Quirkly API Server
 * Extends the built-in Error class with additional properties
 */

class AppError extends Error {
  constructor(message, statusCode, errorCode = 'GENERIC_ERROR', details = null) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  // Convert error to JSON for API responses
  toJSON() {
    return {
      success: false,
      error: this.errorCode,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      details: this.details
    };
  }

  // Static methods for common errors
  static badRequest(message = 'Bad Request', errorCode = 'BAD_REQUEST', details = null) {
    return new AppError(message, 400, errorCode, details);
  }

  static unauthorized(message = 'Unauthorized', errorCode = 'UNAUTHORIZED', details = null) {
    return new AppError(message, 401, errorCode, details);
  }

  static forbidden(message = 'Forbidden', errorCode = 'FORBIDDEN', details = null) {
    return new AppError(message, 403, errorCode, details);
  }

  static notFound(message = 'Not Found', errorCode = 'NOT_FOUND', details = null) {
    return new AppError(message, 404, errorCode, details);
  }

  static conflict(message = 'Conflict', errorCode = 'CONFLICT', details = null) {
    return new AppError(message, 409, errorCode, details);
  }

  static tooManyRequests(message = 'Too Many Requests', errorCode = 'RATE_LIMIT_EXCEEDED', details = null) {
    return new AppError(message, 429, errorCode, details);
  }

  static internalServerError(message = 'Internal Server Error', errorCode = 'INTERNAL_SERVER_ERROR', details = null) {
    return new AppError(message, 500, errorCode, details);
  }

  static serviceUnavailable(message = 'Service Unavailable', errorCode = 'SERVICE_UNAVAILABLE', details = null) {
    return new AppError(message, 503, errorCode, details);
  }

  // Authentication specific errors
  static invalidCredentials(message = 'Invalid email or password') {
    return new AppError(message, 401, 'INVALID_CREDENTIALS');
  }

  static accountLocked(message = 'Account is temporarily locked due to too many failed login attempts') {
    return new AppError(message, 423, 'ACCOUNT_LOCKED');
  }

  static accountInactive(message = 'Account is inactive. Please contact support.') {
    return new AppError(message, 403, 'ACCOUNT_INACTIVE');
  }

  static invalidToken(message = 'Invalid or expired token') {
    return new AppError(message, 401, 'INVALID_TOKEN');
  }

  static tokenExpired(message = 'Token has expired') {
    return new AppError(message, 401, 'TOKEN_EXPIRED');
  }

  static invalidApiKey(message = 'Invalid API key') {
    return new AppError(message, 401, 'INVALID_API_KEY');
  }

  // Validation errors
  static validationError(message = 'Validation failed', details = null) {
    return new AppError(message, 400, 'VALIDATION_ERROR', details);
  }

  static missingFields(fields = []) {
    const message = `Missing required fields: ${fields.join(', ')}`;
    return new AppError(message, 400, 'MISSING_REQUIRED_FIELDS', { missingFields: fields });
  }

  static invalidFormat(field, expectedFormat) {
    const message = `Invalid format for ${field}. Expected: ${expectedFormat}`;
    return new AppError(message, 400, 'INVALID_FORMAT', { field, expectedFormat });
  }

  // Database errors
  static databaseError(message = 'Database operation failed') {
    return new AppError(message, 500, 'DATABASE_ERROR');
  }

  static documentNotFound(resource = 'Resource') {
    return new AppError(`${resource} not found`, 404, 'DOCUMENT_NOT_FOUND');
  }

  static duplicateEntry(field) {
    const message = `${field} already exists`;
    return new AppError(message, 409, 'DUPLICATE_ENTRY', { field });
  }

  // Payment errors
  static paymentError(message = 'Payment processing failed') {
    return new AppError(message, 402, 'PAYMENT_ERROR');
  }

  static insufficientFunds(message = 'Insufficient funds') {
    return new AppError(message, 402, 'INSUFFICIENT_FUNDS');
  }

  static subscriptionRequired(message = 'Active subscription required') {
    return new AppError(message, 402, 'SUBSCRIPTION_REQUIRED');
  }

  static creditsExhausted(message = 'Credits exhausted. Please upgrade your plan.') {
    return new AppError(message, 402, 'CREDITS_EXHAUSTED');
  }

  // Rate limiting errors
  static rateLimitExceeded(message = 'Rate limit exceeded', retryAfter = null) {
    return new AppError(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
  }

  // External service errors
  static externalServiceError(service, message = 'External service error') {
    return new AppError(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', { service });
  }

  static aiServiceError(message = 'AI service temporarily unavailable') {
    return new AppError(message, 503, 'AI_SERVICE_ERROR');
  }
}

module.exports = { AppError };
