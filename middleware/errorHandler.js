const { DebugLogger } = require('../utils/logger');

/**
 * Global error handling middleware
 */
function errorHandler(err, req, res, next) {
  // Log the error
  DebugLogger.logSystemError(err, req.path, {
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Default error response
  let statusCode = 500;
  let message = 'Internal server error';
  let details = null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.details || err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized access';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = 'Access forbidden';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.code === 'P2002') {
    // Prisma unique constraint violation
    statusCode = 409;
    message = 'Duplicate entry';
    details = 'A record with this information already exists';
  } else if (err.code === 'P2025') {
    // Prisma record not found
    statusCode = 404;
    message = 'Record not found';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service unavailable';
    details = 'Database connection failed';
  } else if (err.message && err.message.includes('API key')) {
    statusCode = 401;
    message = 'API authentication failed';
    details = 'Check your API key configuration';
  } else if (err.message && err.message.includes('rate limit')) {
    statusCode = 429;
    message = 'Rate limit exceeded';
    details = 'Please try again later';
  } else if (err.message && err.message.includes('quota')) {
    statusCode = 402;
    message = 'Quota exceeded';
    details = 'Please check your account limits';
  }

  // Prepare error response
  const errorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // Add details in development mode
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = details || err.message;
    errorResponse.stack = err.stack;
  } else if (details) {
    errorResponse.details = details;
  }

  // Add request ID if available
  if (req.id) {
    errorResponse.requestId = req.id;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 404 handler for unknown routes
 */
function notFoundHandler(req, res) {
  DebugLogger.logSystemError(
    new Error('Route not found'), 
    req.path, 
    { method: req.method, ip: req.ip }
  );

  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `${req.method} ${req.path} is not a valid endpoint`,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /api/health',
      'GET /api/leads',
      'POST /api/leads',
      'GET /api/calls',
      'POST /api/calls/initiate',
      'GET /api/analytics/overview',
      'GET /api/dashboard',
      'GET /api/debug/health'
    ]
  });
}

/**
 * Async error wrapper to catch async errors in route handlers
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Request timeout handler
 */
function timeoutHandler(timeout = 30000) {
  return (req, res, next) => {
    req.setTimeout(timeout, () => {
      const err = new Error('Request timeout');
      err.statusCode = 408;
      next(err);
    });
    next();
  };
}

/**
 * Rate limiting error handler
 */
function rateLimitHandler(req, res) {
  DebugLogger.logRateLimitError('api', req.path, req.ip);
  
  res.status(429).json({
    success: false,
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: 60,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  timeoutHandler,
  rateLimitHandler
};
