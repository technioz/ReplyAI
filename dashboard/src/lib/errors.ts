/**
 * Custom Application Error class for Quirkly Next.js API
 * Extends the built-in Error class with additional properties
 */

export class AppError extends Error {
  statusCode: number;
  status: string;
  errorCode: string;
  details: any;
  isOperational: boolean;
  timestamp: string;

  constructor(message: string, statusCode: number, errorCode: string = 'GENERIC_ERROR', details: any = null) {
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
  static badRequest(message: string = 'Bad Request', errorCode: string = 'BAD_REQUEST', details: any = null) {
    return new AppError(message, 400, errorCode, details);
  }

  static unauthorized(message: string = 'Unauthorized', errorCode: string = 'UNAUTHORIZED', details: any = null) {
    return new AppError(message, 401, errorCode, details);
  }

  static forbidden(message: string = 'Forbidden', errorCode: string = 'FORBIDDEN', details: any = null) {
    return new AppError(message, 403, errorCode, details);
  }

  static notFound(message: string = 'Not Found', errorCode: string = 'NOT_FOUND', details: any = null) {
    return new AppError(message, 404, errorCode, details);
  }

  static conflict(message: string = 'Conflict', errorCode: string = 'CONFLICT', details: any = null) {
    return new AppError(message, 409, errorCode, details);
  }

  static tooManyRequests(message: string = 'Too Many Requests', errorCode: string = 'RATE_LIMIT_EXCEEDED', details: any = null) {
    return new AppError(message, 429, errorCode, details);
  }

  static internalServerError(message: string = 'Internal Server Error', errorCode: string = 'INTERNAL_SERVER_ERROR', details: any = null) {
    return new AppError(message, 500, errorCode, details);
  }

  static serviceUnavailable(message: string = 'Service Unavailable', errorCode: string = 'SERVICE_UNAVAILABLE', details: any = null) {
    return new AppError(message, 503, errorCode, details);
  }

  // Authentication specific errors
  static invalidCredentials(message: string = 'Invalid email or password') {
    return new AppError(message, 401, 'INVALID_CREDENTIALS');
  }

  static accountLocked(message: string = 'Account is temporarily locked due to too many failed login attempts') {
    return new AppError(message, 423, 'ACCOUNT_LOCKED');
  }

  static accountInactive(message: string = 'Account is inactive. Please contact support.') {
    return new AppError(message, 403, 'ACCOUNT_INACTIVE');
  }

  static invalidToken(message: string = 'Invalid or expired token') {
    return new AppError(message, 401, 'INVALID_TOKEN');
  }

  static tokenExpired(message: string = 'Token has expired') {
    return new AppError(message, 401, 'TOKEN_EXPIRED');
  }

  static invalidApiKey(message: string = 'Invalid API key') {
    return new AppError(message, 401, 'INVALID_API_KEY');
  }

  // Validation errors
  static validationError(message: string = 'Validation failed', details: any = null) {
    return new AppError(message, 400, 'VALIDATION_ERROR', details);
  }

  static missingFields(fields: string[] = []) {
    const message = `Missing required fields: ${fields.join(', ')}`;
    return new AppError(message, 400, 'MISSING_REQUIRED_FIELDS', { missingFields: fields });
  }

  static invalidFormat(field: string, expectedFormat: string) {
    const message = `Invalid format for ${field}. Expected: ${expectedFormat}`;
    return new AppError(message, 400, 'INVALID_FORMAT', { field, expectedFormat });
  }

  // Database errors
  static databaseError(message: string = 'Database operation failed') {
    return new AppError(message, 500, 'DATABASE_ERROR');
  }

  static documentNotFound(resource: string = 'Resource') {
    return new AppError(`${resource} not found`, 404, 'DOCUMENT_NOT_FOUND');
  }

  static duplicateEntry(field: string) {
    const message = `${field} already exists`;
    return new AppError(message, 409, 'DUPLICATE_ENTRY', { field });
  }

  // Payment errors
  static paymentError(message: string = 'Payment processing failed') {
    return new AppError(message, 402, 'PAYMENT_ERROR');
  }

  static insufficientFunds(message: string = 'Insufficient funds') {
    return new AppError(message, 402, 'INSUFFICIENT_FUNDS');
  }

  static subscriptionRequired(message: string = 'Active subscription required') {
    return new AppError(message, 402, 'SUBSCRIPTION_REQUIRED');
  }

  static creditsExhausted(message: string = 'Credits exhausted. Please upgrade your plan.') {
    return new AppError(message, 402, 'CREDITS_EXHAUSTED');
  }

  // Rate limiting errors
  static rateLimitExceeded(message: string = 'Rate limit exceeded', retryAfter: number | null = null) {
    return new AppError(message, 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
  }

  // External service errors
  static externalServiceError(service: string, message: string = 'External service error') {
    return new AppError(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', { service });
  }

  static aiServiceError(message: string = 'AI service temporarily unavailable') {
    return new AppError(message, 503, 'AI_SERVICE_ERROR');
  }
}

// Async error wrapper
export const catchAsync = (fn: Function) => {
  return async (req: Request, ...args: any[]) => {
    try {
      return await fn(req, ...args);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Unhandled error:', error);
      throw new AppError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
    }
  };
};

// Error handler for Next.js API routes
export const handleApiError = (error: any) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-Extension-Version, Accept, Origin',
  };

  if (error instanceof AppError) {
    return Response.json(error.toJSON(), { 
      status: error.statusCode,
      headers: corsHeaders
    });
  }

  console.error('Unhandled API error:', error);
  
  const appError = new AppError(
    'Internal server error',
    500,
    'INTERNAL_SERVER_ERROR'
  );

  return Response.json(appError.toJSON(), { 
    status: 500,
    headers: corsHeaders
  });
};

// Credit management helper functions
export const requireCredits = async (request: any, creditsNeeded: number = 1) => {
  // This is a placeholder - the actual implementation should be in auth middleware
  throw new AppError('Credits required', 402, 'CREDITS_REQUIRED');
};

export const handleFreeCredits = async (request: any) => {
  // This is a placeholder - the actual implementation should be in auth middleware
  return true;
};
