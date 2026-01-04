/**
 * Centralized Rate Limiting Middleware
 * Supports IP-based and composite key rate limiting
 */

const logger = require('../helpers/logger');

/**
 * Create a rate limiter middleware
 * @param {Object} options - Rate limiter options
 * @param {number} [options.windowMs=15*60*1000] - Time window in milliseconds
 * @param {number} [options.max=10] - Maximum requests per window
 * @param {Function} [options.keyGenerator] - Function to generate rate limit key (default: req.ip)
 * @param {string} [options.errorCode='RATE_LIMITED'] - Error code for rate limit responses
 * @param {string} [options.errorMessage='Too many requests. Try again later.'] - Error message
 * @returns {Function} Express middleware function
 */
function createRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 10,
    keyGenerator = (req) => req.ip,
    errorCode = 'RATE_LIMITED',
    errorMessage = 'Too many requests. Try again later.'
  } = options;

  // In-memory storage for rate limit buckets
  const rateBuckets = new Map();

  return (req, res, next) => {
    try {
      const key = keyGenerator(req);
      const now = Date.now();
      let bucket = rateBuckets.get(key);

      // Create new bucket or reset expired bucket
      if (!bucket || bucket.reset < now) {
        bucket = { count: 1, reset: now + windowMs };
        rateBuckets.set(key, bucket);
        return next();
      }

      // Check if rate limit exceeded
      if (bucket.count >= max) {
        logger.warn('[RATE_LIMITER] Rate limit hit', { key, count: bucket.count, max });
        return res.status(429).json({
          error: { message: errorMessage, code: errorCode },
          message: errorMessage
        });
      }

      // Increment counter and allow request
      bucket.count++;
      next();
    } catch (error) {
      logger.error('[RATE_LIMITER] Error in rate limiter', { error: error.message });
      // On error, allow request to proceed (fail open)
      next();
    }
  };
}

module.exports = {
  createRateLimiter
};

