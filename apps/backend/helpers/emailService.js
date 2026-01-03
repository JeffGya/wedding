/**
 * Unified Email Sending Service
 * Consolidates all email sending logic with retry, rate limiting, and optional tracking
 */

const resendClient = require('./resendClient');
const logger = require('./logger');
const getSenderInfo = require('./getSenderInfo');
const { DateTime } = require('luxon');

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
    maxRetries = 3,
    backoff = [0, 2000, 4000]
  } = options;

  logger.debug('[EMAIL_SERVICE] Sending email', { to, subject: subject?.substring(0, 50) });

  // Validate required fields
  if (!to || !subject || !html) {
    const error = 'Missing required fields: to, subject, html';
    logger.error('[EMAIL_SERVICE] Validation failed', { to: !!to, subject: !!subject, html: !!html });
    return { success: false, error };
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
        logger.info('[EMAIL_SERVICE] Email sent', { to, messageId: response.data.id });
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
        const delayMs = backoff[retries] || backoff[backoff.length - 1];
        logger.warn('[EMAIL_SERVICE] Rate limited, retrying', { attempt: retries, delayMs, to });
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
      await dbRun(
        `INSERT INTO message_recipients (message_id, guest_id, delivery_status, sent_at, status, resend_message_id) 
         VALUES (?, ?, 'sent', ?, 'sent', ?)`,
        [messageId, guestId, sentAt, result.messageId]
      );
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
      await dbRun(
        `INSERT INTO message_recipients (message_id, guest_id, delivery_status, error_message) 
         VALUES (?, ?, 'failed', ?)`,
        [messageId, guestId, result.error]
      );
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

  logger.debug('[EMAIL_SERVICE] Batch sending', { emailCount: emails.length, batchSize });

  const results = [];
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchPromises = batch.map(async (emailOptions) => {
      await delay(emailDelay);
      
      // Get tracking info if provided
      const trackingInfo = getTrackingInfo ? getTrackingInfo(emailOptions) : {};
      
      const result = await sendEmailWithTracking({
        ...emailOptions,
        db,
        ...trackingInfo
      });
      
      results.push(result);
    });
    
    await Promise.all(batchPromises);
    
    // Delay between batches
    if (i + batchSize < emails.length) {
      await delay(batchDelay);
    }
  }

  const sentCount = results.filter(r => r.success || r.status === 'sent').length;
  const failedCount = results.filter(r => !r.success || r.status === 'failed').length;

  logger.info('[EMAIL_SERVICE] Batch completed', { sentCount, failedCount, total: emails.length });

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

