/**
 * Unified Email Sending Service
 * Consolidates all email sending logic with retry, rate limiting, and optional tracking
 */

const resendClient = require('./resendClient');
const logger = require('./logger');
const getSenderInfo = require('./getSenderInfo');
const { DateTime } = require('luxon');
const quotaTracker = require('./quotaTracker');

/**
 * Send a single email with retry logic
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - Email HTML content
 * @param {string} [options.from] - Sender email (auto-fetched if not provided)
 * @param {Object} [options.db] - Database connection (for auto-fetching sender info)
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {number[]} [options.backoff=[0, 2000, 4000]] - Retry backoff delays in ms
 * @returns {Promise<Object>} Result object with success, messageId, error
 */
async function sendEmail(options) {
  const {
    to,
    subject,
    html,
    from,
    db,
    maxRetries = 5, // Increased for rate limit scenarios
    backoff = [0, 2000, 4000]
  } = options;


  // Validate required fields
  if (!to || !subject || !html) {
    const error = 'Missing required fields: to, subject, html';
    logger.error('[EMAIL_SERVICE] Validation failed', { to: !!to, subject: !!subject, html: !!html });
    return { success: false, error };
  }

  // Check quota before sending
  if (!quotaTracker.canSend()) {
    const quotaStatus = quotaTracker.getQuotaStatus();
    logger.warn('[EMAIL_SERVICE] Quota exceeded, queuing message', { 
      to, 
      daily: `${quotaStatus.daily.sent}/${quotaStatus.daily.limit}`,
      monthly: `${quotaStatus.monthly.sent}/${quotaStatus.monthly.limit}`
    });
    
    // Queue the message
    quotaTracker.queueMessage({ to, subject, html, from, db });
    
    return { 
      success: false, 
      error: 'Quota exceeded. Message queued for sending when quota resets.',
      queued: true 
    };
  }

  // Get sender info if not provided
  let senderInfo = from;
  if (!senderInfo && db) {
    senderInfo = await getSenderInfo(db);
  }
  if (!senderInfo) {
    const error = 'Sender info not available';
    logger.error('[EMAIL_SERVICE] Sender info not available');
    return { success: false, error };
  }

  const emailData = {
    from: senderInfo,
    to,
    subject,
    html
  };

  let retries = 0;
  while (retries <= maxRetries) {
    try {
      const response = await resendClient.emails.send(emailData);
      
      if (response && response.data && response.data.id) {
        // Increment quota counters after successful send
        quotaTracker.incrementSent();
        
        // Log successful sends only in development or if LOG_LEVEL is DEBUG
        if (process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'DEBUG') {
          logger.info('[EMAIL_SERVICE] Email sent', { to, messageId: response.data.id });
        }
        return {
          success: true,
          messageId: response.data.id,
          response: response.data
        };
      } else {
        const errorMsg = 'Resend API did not accept email for delivery';
        logger.error('[EMAIL_SERVICE] Email not accepted', { to });
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      // Check for rate limiting (429)
      const isRateLimit = err.status === 429 || 
                         err.response?.status === 429 || 
                         (err.error && err.error.status === 429);
      
      if (isRateLimit && retries < maxRetries) {
        retries++;
        
        // Extract retry-after header from response
        let delayMs = backoff[retries] || backoff[backoff.length - 1];
        const retryAfterHeader = err.response?.headers?.['retry-after'] || 
                                err.response?.headers?.['Retry-After'] ||
                                err.headers?.['retry-after'] ||
                                err.headers?.['Retry-After'];
        
        if (retryAfterHeader) {
          try {
            // Parse retry-after value (can be seconds as number or string)
            const retryAfterSeconds = typeof retryAfterHeader === 'string' 
              ? parseInt(retryAfterHeader, 10) 
              : retryAfterHeader;
            
            if (!isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
              delayMs = retryAfterSeconds * 1000; // Convert to milliseconds
            }
          } catch (parseError) {
            // Use backoff delay on parse error
          }
        }
        
        // Only log rate limit retries in development
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('[EMAIL_SERVICE] Rate limited, retrying', { attempt: retries, delayMs, to });
        }
        
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      
      // Non-retryable error or max retries reached
      const errorMsg = err.error?.message || 
                     (err.response?.data ? JSON.stringify(err.response.data) : err.message);
      logger.error('[EMAIL_SERVICE] Send failed', { to, error: errorMsg });
      return { success: false, error: errorMsg };
    }
  }

  logger.error('[EMAIL_SERVICE] Max retries exceeded', { to });
  return { success: false, error: 'Max retries exceeded' };
}

/**
 * Send email with database tracking
 * @param {Object} options - Email options plus tracking
 * @param {Object} options.db - Database connection
 * @param {number} [options.messageId] - Message ID for tracking
 * @param {number} [options.guestId] - Guest ID for tracking
 * @param {Function} [options.onSuccess] - Callback on success (receives result, db, messageId, guestId)
 * @param {Function} [options.onFailure] - Callback on failure (receives error, db, messageId, guestId)
 * @returns {Promise<Object>} Result with success, status, resendId, error
 */
async function sendEmailWithTracking(options) {
  const {
    db,
    messageId,
    guestId,
    onSuccess,
    onFailure,
    ...emailOptions
  } = options;

  const result = await sendEmail({
    ...emailOptions,
    db
  });

  if (result.success) {
    if (onSuccess) {
      await onSuccess(result, db, messageId, guestId);
    } else if (db && messageId && guestId) {
      // Default tracking: insert into message_recipients
      const { createDbHelpers } = require('../db/queryHelpers');
      const { dbRun } = createDbHelpers(db);
      const sentAt = DateTime.utc().toFormat('yyyy-MM-dd HH:mm:ss');
      try {
        await dbRun(
          `INSERT INTO message_recipients (message_id, guest_id, delivery_status, sent_at, status, resend_message_id) 
           VALUES (?, ?, 'sent', ?, 'sent', ?)`,
          [messageId, guestId, sentAt, result.messageId]
        );
      } catch (insertError) {
        // If INSERT fails (e.g., due to unique constraint), try UPDATE instead
        try {
          await dbRun(
            `UPDATE message_recipients 
             SET delivery_status = 'sent', sent_at = ?, status = 'sent', resend_message_id = ?, updated_at = CURRENT_TIMESTAMP
             WHERE message_id = ? AND guest_id = ?`,
            [sentAt, result.messageId, messageId, guestId]
          );
        } catch (updateError) {
          // Log but don't throw - email was sent successfully
          const logger = require('./logger');
          logger.error('[EMAIL_SERVICE] Failed to track recipient record', { messageId, guestId, error: updateError.message });
        }
      }
    }
    
    return {
      success: true,
      status: 'sent',
      resendId: result.messageId,
      guest_id: guestId
    };
  } else {
    if (onFailure) {
      await onFailure(result.error, db, messageId, guestId);
    } else if (db && messageId && guestId) {
      // Default tracking: log failure
      const { createDbHelpers } = require('../db/queryHelpers');
      const { dbRun } = createDbHelpers(db);
      try {
        await dbRun(
          `INSERT INTO message_recipients (message_id, guest_id, delivery_status, error_message) 
           VALUES (?, ?, 'failed', ?)`,
          [messageId, guestId, result.error]
        );
      } catch (insertError) {
        // If INSERT fails, try UPDATE instead
        try {
          await dbRun(
            `UPDATE message_recipients 
             SET delivery_status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP
             WHERE message_id = ? AND guest_id = ?`,
            [result.error, messageId, guestId]
          );
        } catch (updateError) {
          // Log but don't throw
          const logger = require('./logger');
          logger.error('[EMAIL_SERVICE] Failed to track failed recipient record', { messageId, guestId, error: updateError.message });
        }
      }
    }
    
    return {
      success: false,
      status: 'failed',
      error: result.error,
      guest_id: guestId
    };
  }
}

/**
 * Send batch emails with rate limiting and tracking
 * @param {Object} options - Batch options
 * @param {Array} options.emails - Array of email options (each with to, subject, html, etc.)
 * @param {Object} options.db - Database connection
 * @param {number} [options.batchSize=1] - Emails per batch
 * @param {number} [options.batchDelay=2000] - Delay between batches (ms)
 * @param {number} [options.emailDelay=300] - Delay between individual emails (ms)
 * @param {Function} [options.getTrackingInfo] - Function to get messageId/guestId from email options
 * @returns {Promise<Object>} Results with sentCount, failedCount, results array
 */
async function sendBatchEmails(options) {
  const {
    emails,
    db,
    batchSize = 1,
    batchDelay = 2000,
    emailDelay = 300,
    getTrackingInfo
  } = options;


  const results = [];
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    let batchPaused = false;
    let pauseDelay = 0;
    
    const batchPromises = batch.map(async (emailOptions) => {
      await delay(emailDelay);
      
      // Get tracking info if provided
      const trackingInfo = getTrackingInfo ? getTrackingInfo(emailOptions) : {};
      
      const result = await sendEmailWithTracking({
        ...emailOptions,
        db,
        ...trackingInfo
      });
      
      // Check if rate limited (indicated by error message containing rate limit info)
      if (!result.success && result.error && (
        result.error.includes('429') || 
        result.error.toLowerCase().includes('rate limit') ||
        result.error.toLowerCase().includes('too many requests')
      )) {
        // Extract retry-after from error if available, or use default
        const retryAfterMatch = result.error.match(/retry[-\s]after[:\s]+(\d+)/i);
        if (retryAfterMatch) {
          pauseDelay = parseInt(retryAfterMatch[1], 10) * 1000;
        } else {
          pauseDelay = 1000; // Default 1 second
        }
        batchPaused = true;
        logger.warn('[EMAIL_SERVICE] Batch paused due to rate limit', { 
          pauseDelay 
        });
      }
      
      results.push(result);
    });
    
    await Promise.all(batchPromises);
    
    // If batch was paused due to rate limit, wait before continuing
    if (batchPaused && pauseDelay > 0) {
      await delay(pauseDelay);
    }
    
    // Delay between batches
    if (i + batchSize < emails.length) {
      await delay(batchDelay);
    }
  }

  const sentCount = results.filter(r => r.success || r.status === 'sent').length;
  const failedCount = results.filter(r => !r.success || r.status === 'failed').length;

  // Only log batch completion if there were failures or in development
  if (failedCount > 0 || process.env.NODE_ENV !== 'production') {
    logger.info('[EMAIL_SERVICE] Batch completed', { sentCount, failedCount, total: emails.length });
  }

  return {
    success: true,
    sentCount,
    failedCount,
    results
  };
}

module.exports = {
  sendEmail,
  sendEmailWithTracking,
  sendBatchEmails
};

