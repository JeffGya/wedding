/**
 * Unified Error Handler Utility
 * Provides consistent error response format across all routes
 * Matches the format used by the central error handler in index.js
 */

const logger = require('../helpers/logger');

/**
 * Send a standardized error response
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @param {string} code - Optional error code
 * @param {string} details - Optional error details (only in non-production)
 * @param {string} context - Optional context for logging
 */
function sendError(res, status, message, code = null, details = null, context = null) {
  const payload = {
    error: { message },
    message // Legacy field for backward compatibility
  };

  if (code) {
    payload.error.code = code;
  }

  // Include details and stack only in non-production
  if (process.env.NODE_ENV !== 'production') {
    if (details) {
      payload.error.details = details;
    }
  }

  return res.status(status).json(payload);
}

/**
 * Send validation error response for express-validator
 * @param {Object} res - Express response object
 * @param {Object} validationResult - express-validator validation result
 */
function sendValidationError(res, validationResult) {
  const errors = validationResult.array();

  const payload = {
    error: {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR'
    },
    message: 'Validation failed', // Legacy field
    errors: errors.map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }))
  };

  return res.status(400).json(payload);
}

/**
 * Send 404 Not Found error
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name (e.g., 'Template', 'Message')
 * @param {string|number} id - Optional resource ID
 */
function sendNotFound(res, resource = 'Resource', id = null) {
  const message = id 
    ? `${resource} with ID ${id} not found`
    : `${resource} not found`;

  return sendError(res, 404, message, 'NOT_FOUND', null, `${resource} not found`);
}

/**
 * Send 401 Unauthorized error
 * @param {Object} res - Express response object
 * @param {string} message - Optional custom message
 */
function sendUnauthorized(res, message = 'Unauthorized') {
  return sendError(res, 401, message, 'UNAUTHORIZED', null, 'Unauthorized access');
}

/**
 * Send 403 Forbidden error
 * @param {Object} res - Express response object
 * @param {string} message - Optional custom message
 */
function sendForbidden(res, message = 'Forbidden') {
  return sendError(res, 403, message, 'FORBIDDEN', null, 'Insufficient permissions');
}

/**
 * Send 400 Bad Request error
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {string} code - Optional error code (defaults to 'BAD_REQUEST')
 */
function sendBadRequest(res, message, code = 'BAD_REQUEST') {
  return sendError(res, 400, message, code, null, 'Bad request');
}

/**
 * Send 500 Internal Server Error
 * @param {Object} res - Express response object
 * @param {Error} err - Error object
 * @param {string} context - Optional context for logging (e.g., route name)
 */
function sendInternalError(res, err, context = null) {
  const errorMessage = err?.message || 'Internal server error';
  const errorStack = err?.stack;

  logger.error('[ERROR_HANDLER] Internal server error', { 
    context, 
    message: errorMessage,
    stack: errorStack 
  });

  const payload = {
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    },
    message: 'Internal server error' // Legacy field
  };

  // Include error details only in non-production
  if (process.env.NODE_ENV !== 'production') {
    if (errorMessage) {
      payload.error.details = errorMessage;
    }
    if (errorStack) {
      payload.error.stack = errorStack;
    }
  }

  return res.status(500).json(payload);
}

module.exports = {
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendBadRequest,
  sendInternalError
};

