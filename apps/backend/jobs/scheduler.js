// apps/backend/jobs/scheduler.js

const cron = require('node-cron');
const { sendScheduledMessages } = require('../helpers/sendScheduledMessages');
const logger = require('../helpers/logger');


function startScheduler() {
  // Schedule to run every hour (at minute 0)
  cron.schedule('* * * * *', async () => {
    logger.info('⏰ Scheduler triggered: Checking for scheduled messages...');
    try {
      await sendScheduledMessages();
      logger.info('✅ Scheduled message check completed.');
    } catch (error) {
      logger.error('❌ Error while sending scheduled messages:', error);
    }
  });

  logger.info('📅 Scheduler started successfully (currently set to run every hour).');
}

module.exports = startScheduler;
