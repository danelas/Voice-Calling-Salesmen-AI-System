const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` | Meta: ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\nStack: ${stack}`;
    }
    
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'voice-sales-ai' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // API logs
    new winston.transports.File({
      filename: path.join(logsDir, 'api.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    }),
    
    // Call logs
    new winston.transports.File({
      filename: path.join(logsDir, 'calls.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Specialized logging functions for common issues
class DebugLogger {
  
  // Database connection issues
  static logDatabaseError(error, operation, query = null) {
    logger.error('Database Error', {
      type: 'DATABASE_ERROR',
      operation: operation,
      error: error.message,
      code: error.code,
      query: query,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  // API key validation issues
  static logApiKeyError(service, error, keyPresent = false) {
    logger.error('API Key Error', {
      type: 'API_KEY_ERROR',
      service: service,
      error: error.message,
      keyPresent: keyPresent,
      timestamp: new Date().toISOString()
    });
  }

  // OpenAI API issues
  static logOpenAIError(error, operation, requestData = null) {
    logger.error('OpenAI API Error', {
      type: 'OPENAI_ERROR',
      operation: operation,
      error: error.message,
      statusCode: error.status || error.statusCode,
      requestData: requestData ? JSON.stringify(requestData).substring(0, 500) : null,
      rateLimited: error.message?.includes('rate limit'),
      timestamp: new Date().toISOString()
    });
  }

  // ElevenLabs API issues
  static logElevenLabsError(error, operation, textLength = 0) {
    logger.error('ElevenLabs API Error', {
      type: 'ELEVENLABS_ERROR',
      operation: operation,
      error: error.message,
      statusCode: error.status || error.statusCode,
      textLength: textLength,
      quotaExceeded: error.message?.includes('quota') || error.message?.includes('limit'),
      timestamp: new Date().toISOString()
    });
  }

  // TextMagic API issues
  static logTextMagicError(error, operation, phoneNumber = null) {
    logger.error('TextMagic API Error', {
      type: 'TEXTMAGIC_ERROR',
      operation: operation,
      error: error.message,
      phoneNumber: phoneNumber,
      invalidNumber: error.message?.includes('invalid') || error.message?.includes('format'),
      timestamp: new Date().toISOString()
    });
  }

  // Call processing errors
  static logCallError(callId, error, stage, leadId = null) {
    logger.error('Call Processing Error', {
      type: 'CALL_ERROR',
      callId: callId,
      leadId: leadId,
      stage: stage, // 'initiation', 'processing', 'ending', 'analysis'
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }

  // Validation errors
  static logValidationError(endpoint, validationErrors, requestData = null) {
    logger.warn('Validation Error', {
      type: 'VALIDATION_ERROR',
      endpoint: endpoint,
      errors: validationErrors,
      requestData: requestData ? JSON.stringify(requestData).substring(0, 300) : null,
      timestamp: new Date().toISOString()
    });
  }

  // File system errors (audio files, etc.)
  static logFileSystemError(error, operation, filePath = null) {
    logger.error('File System Error', {
      type: 'FILESYSTEM_ERROR',
      operation: operation,
      error: error.message,
      filePath: filePath,
      code: error.code,
      timestamp: new Date().toISOString()
    });
  }

  // Authentication/Authorization errors
  static logAuthError(error, endpoint, userId = null) {
    logger.warn('Authentication Error', {
      type: 'AUTH_ERROR',
      endpoint: endpoint,
      error: error.message,
      userId: userId,
      timestamp: new Date().toISOString()
    });
  }

  // Rate limiting issues
  static logRateLimitError(service, endpoint, userId = null) {
    logger.warn('Rate Limit Exceeded', {
      type: 'RATE_LIMIT_ERROR',
      service: service,
      endpoint: endpoint,
      userId: userId,
      timestamp: new Date().toISOString()
    });
  }

  // Performance issues
  static logPerformanceIssue(operation, duration, threshold = 5000) {
    if (duration > threshold) {
      logger.warn('Performance Issue', {
        type: 'PERFORMANCE_WARNING',
        operation: operation,
        duration: duration,
        threshold: threshold,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Successful operations (for debugging)
  static logSuccess(operation, details = {}) {
    logger.info('Operation Success', {
      type: 'SUCCESS',
      operation: operation,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  // Call analytics logging
  static logCallAnalytics(callId, analytics) {
    logger.info('Call Analytics', {
      type: 'CALL_ANALYTICS',
      callId: callId,
      duration: analytics.duration,
      outcome: analytics.outcome,
      engagementScore: analytics.engagementScore,
      conversionProbability: analytics.conversionProbability,
      timestamp: new Date().toISOString()
    });
  }

  // System health checks
  static logHealthCheck(component, status, details = {}) {
    const logLevel = status === 'healthy' ? 'info' : 'warn';
    logger.log(logLevel, 'Health Check', {
      type: 'HEALTH_CHECK',
      component: component,
      status: status,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  // Lead processing issues
  static logLeadError(leadId, error, operation) {
    logger.error('Lead Processing Error', {
      type: 'LEAD_ERROR',
      leadId: leadId,
      operation: operation,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }

  // Bulk operation issues
  static logBulkOperationError(operation, totalItems, failedItems, errors) {
    logger.error('Bulk Operation Error', {
      type: 'BULK_OPERATION_ERROR',
      operation: operation,
      totalItems: totalItems,
      failedItems: failedItems,
      successRate: ((totalItems - failedItems) / totalItems * 100).toFixed(2) + '%',
      errors: errors.slice(0, 10), // Log first 10 errors
      timestamp: new Date().toISOString()
    });
  }

  // Memory and resource issues
  static logResourceIssue(type, current, limit, unit = 'MB') {
    logger.warn('Resource Issue', {
      type: 'RESOURCE_WARNING',
      resourceType: type,
      current: current,
      limit: limit,
      unit: unit,
      utilization: ((current / limit) * 100).toFixed(2) + '%',
      timestamp: new Date().toISOString()
    });
  }

  // Configuration issues
  static logConfigError(configKey, error, defaultUsed = null) {
    logger.error('Configuration Error', {
      type: 'CONFIG_ERROR',
      configKey: configKey,
      error: error,
      defaultUsed: defaultUsed,
      timestamp: new Date().toISOString()
    });
  }

  // External service timeouts
  static logTimeoutError(service, operation, timeout, actualTime = null) {
    logger.error('Service Timeout', {
      type: 'TIMEOUT_ERROR',
      service: service,
      operation: operation,
      timeoutMs: timeout,
      actualTimeMs: actualTime,
      timestamp: new Date().toISOString()
    });
  }

  // General system errors (used by error handler middleware)
  static logSystemError(error, path, context = {}) {
    logger.error('System Error', {
      type: 'SYSTEM_ERROR',
      error: error.message,
      path: path,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString()
    });
  }
}

// Export both the logger and debug logger
module.exports = {
  logger,
  DebugLogger
};
