// apps/backend/jobs/scheduler.js

const cron = require('node-cron');
const { sendScheduledMessages } = require('../helpers/sendScheduledMessages');
const logger = require('../helpers/logger');


function startScheduler() {
  // Schedule to run every hour
  cron.schedule('0 * * * *', async () => {
    logger.debug('⏰ Scheduler triggered: Checking for scheduled messages...');
    try {
      await sendScheduledMessages();
      logger.debug('✅ Scheduled message check completed.');
    } catch (error) {
      logger.error('❌ Error while sending scheduled messages:', error);
    }
  });

  logger.debug('📅 Scheduler started successfully (currently set to run every hour).');
}

module.exports = startScheduler;
