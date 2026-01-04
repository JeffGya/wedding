/**
 * Resend Quota Tracker
 * Tracks daily (100) and monthly (3000) email quotas
 * Manages queue of messages when quotas are exceeded
 * All tracking is in-memory (no database)
 */

const logger = require('./logger');
const { DateTime } = require('luxon');

// Quota limits (Resend free tier)
const DAILY_LIMIT = 100;
const MONTHLY_LIMIT = 3000;

// In-memory tracking
let dailyCount = 0;
let monthlyCount = 0;
let dailyResetTime = null;
let monthlyResetTime = null;
const messageQueue = [];

/**
 * Initialize reset times
 */
function initializeResetTimes() {
  const now = DateTime.utc();
  
  // Daily reset: next midnight UTC
  dailyResetTime = now.endOf('day').plus({ seconds: 1 });
  
  // Monthly reset: first day of next month at midnight UTC
  monthlyResetTime = now.endOf('month').plus({ seconds: 1 });
  
  // Log initialization only in development
  if (process.env.NODE_ENV !== 'production') {
    logger.info('[QUOTA_TRACKER] Initialized', {
      dailyReset: dailyResetTime.toISO(),
      monthlyReset: monthlyResetTime.toISO()
    });
  }
}

/**
 * Check and reset daily quota if needed
 */
function checkDailyReset() {
  const now = DateTime.utc();
  if (dailyResetTime && now >= dailyResetTime) {
    const oldCount = dailyCount;
    dailyCount = 0;
    dailyResetTime = now.endOf('day').plus({ seconds: 1 });
    logger.info('[QUOTA_TRACKER] Daily quota reset', { 
      previousCount: oldCount,
      newResetTime: dailyResetTime.toISO()
    });
    return true;
  }
  return false;
}

/**
 * Check and reset monthly quota if needed
 */
function checkMonthlyReset() {
  const now = DateTime.utc();
  if (monthlyResetTime && now >= monthlyResetTime) {
    const oldCount = monthlyCount;
    monthlyCount = 0;
    monthlyResetTime = now.endOf('month').plus({ seconds: 1 });
    logger.info('[QUOTA_TRACKER] Monthly quota reset', { 
      previousCount: oldCount,
      newResetTime: monthlyResetTime.toISO()
    });
    return true;
  }
  return false;
}

/**
 * Check if we can send an email (quota not exceeded)
 * @returns {boolean} True if can send, false if quota exceeded
 */
function canSend() {
  checkDailyReset();
  checkMonthlyReset();
  
  const canSendDaily = dailyCount < DAILY_LIMIT;
  const canSendMonthly = monthlyCount < MONTHLY_LIMIT;
  
  return canSendDaily && canSendMonthly;
}

/**
 * Increment sent counters after successful send
 */
function incrementSent() {
  checkDailyReset();
  checkMonthlyReset();
  
  dailyCount++;
  monthlyCount++;
}

/**
 * Queue a message when quota is exceeded
 * @param {Object} emailOptions - Email options to queue
 */
function queueMessage(emailOptions) {
  const queuedAt = DateTime.utc().toISO();
  messageQueue.push({
    ...emailOptions,
    queuedAt
  });
  
  logger.warn('[QUOTA_TRACKER] Message queued', {
    queueLength: messageQueue.length,
    to: emailOptions.to,
    queuedAt
  });
}

/**
 * Get current quota status
 * @returns {Object} Quota status with daily and monthly info
 */
function getQuotaStatus() {
  checkDailyReset();
  checkMonthlyReset();
  
  const now = DateTime.utc();
  
  return {
    daily: {
      sent: dailyCount,
      limit: DAILY_LIMIT,
      remaining: Math.max(0, DAILY_LIMIT - dailyCount),
      resetsAt: dailyResetTime ? dailyResetTime.toISO() : null
    },
    monthly: {
      sent: monthlyCount,
      limit: MONTHLY_LIMIT,
      remaining: Math.max(0, MONTHLY_LIMIT - monthlyCount),
      resetsAt: monthlyResetTime ? monthlyResetTime.toISO() : null
    }
  };
}

/**
 * Get queue status
 * @returns {Object} Queue status with length and validity
 */
function getQueueStatus() {
  checkDailyReset();
  checkMonthlyReset();
  
  // Determine when queue will be valid (next quota reset)
  const now = DateTime.utc();
  let validUntil = null;
  
  if (dailyCount >= DAILY_LIMIT && monthlyCount >= MONTHLY_LIMIT) {
    // Both quotas exceeded - use the earlier reset time
    validUntil = dailyResetTime < monthlyResetTime ? dailyResetTime : monthlyResetTime;
  } else if (dailyCount >= DAILY_LIMIT) {
    validUntil = dailyResetTime;
  } else if (monthlyCount >= MONTHLY_LIMIT) {
    validUntil = monthlyResetTime;
  }
  
  return {
    length: messageQueue.length,
    validUntil: validUntil ? validUntil.toISO() : null
  };
}

/**
 * Process queued messages when quota allows
 * @param {Function} sendFunction - Function to call to send email (receives emailOptions)
 * @returns {Promise<Object>} Results with processed count
 */
async function processQueue(sendFunction) {
  if (!sendFunction || typeof sendFunction !== 'function') {
    logger.error('[QUOTA_TRACKER] Invalid send function provided');
    return { processed: 0, sent: 0, failed: 0 };
  }
  
  checkDailyReset();
  checkMonthlyReset();
  
  if (!canSend()) {
    return { processed: 0, sent: 0, failed: 0 };
  }
  
  if (messageQueue.length === 0) {
    return { processed: 0, sent: 0, failed: 0 };
  }
  
  logger.info('[QUOTA_TRACKER] Processing queue', { queueLength: messageQueue.length });
  
  let processed = 0;
  let sent = 0;
  let failed = 0;
  
  // Process messages while quota allows
  while (messageQueue.length > 0 && canSend()) {
    const emailOptions = messageQueue.shift();
    processed++;
    
    try {
      const result = await sendFunction(emailOptions);
      if (result && result.success) {
        incrementSent();
        sent++;
      } else {
        // Re-queue if send failed (unless it's a permanent error)
        const isPermanentError = result && result.error && (
          result.error.includes('invalid') ||
          result.error.includes('not found') ||
          result.error.includes('missing')
        );
        
        if (!isPermanentError) {
          messageQueue.push(emailOptions);
          logger.warn('[QUOTA_TRACKER] Queued message failed, re-queued', { 
            to: emailOptions.to, 
            error: result?.error 
          });
        } else {
          logger.error('[QUOTA_TRACKER] Queued message failed permanently', { 
            to: emailOptions.to, 
            error: result?.error 
          });
        }
        failed++;
      }
    } catch (error) {
      // Re-queue on error
      messageQueue.push(emailOptions);
      logger.error('[QUOTA_TRACKER] Error processing queued message', { 
        to: emailOptions.to, 
        error: error.message 
      });
      failed++;
    }
  }
  
  if (processed > 0) {
    logger.info('[QUOTA_TRACKER] Queue processed', { 
      sent, 
      failed, 
      remaining: messageQueue.length 
    });
  }
  
  return { processed, sent, failed, remaining: messageQueue.length };
}

// Initialize on module load
initializeResetTimes();

// Set up periodic checks for resets (check every minute)
setInterval(() => {
  checkDailyReset();
  checkMonthlyReset();
}, 60 * 1000); // 1 minute

module.exports = {
  canSend,
  incrementSent,
  queueMessage,
  getQuotaStatus,
  getQueueStatus,
  processQueue,
  // Expose for testing
  _reset: () => {
    dailyCount = 0;
    monthlyCount = 0;
    messageQueue.length = 0;
    initializeResetTimes();
  }
};

