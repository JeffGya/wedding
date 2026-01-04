// apps/backend/jobs/scheduler.js

const cron = require('node-cron');
const { sendScheduledMessages } = require('../helpers/sendScheduledMessages');
const logger = require('../helpers/logger');
const quotaTracker = require('../helpers/quotaTracker');
const { sendEmail } = require('../helpers/emailService');


function startScheduler() {
  // Schedule to run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await sendScheduledMessages();
    } catch (error) {
      logger.error('[SCHEDULER] Error sending scheduled messages', { error: error.message });
    }
  });

  // Process quota queue every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await quotaTracker.processQueue(async (emailOptions) => {
        return await sendEmail(emailOptions);
      });
      
      if (result.processed > 0) {
        logger.info('[SCHEDULER] Quota queue processed', {
          sent: result.sent,
          failed: result.failed,
          remaining: result.remaining
        });
      }
    } catch (error) {
      logger.error('[SCHEDULER] Error processing quota queue', { error: error.message });
    }
  });

  // Only log startup in development
  if (process.env.NODE_ENV !== 'production') {
    logger.debug('[SCHEDULER] Started');
  }
}

module.exports = startScheduler;
