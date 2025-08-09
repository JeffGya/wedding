const getDbConnection = require('../db/connection');
const logger = require('./logger');
const getSenderInfo = require('./getSenderInfo');
const resend = require('./resendClient'); // Assuming resendClient is already configured

const db = getDbConnection();
let dbGet, dbAll, dbRun;
if (process.env.DB_TYPE === 'mysql') {
  dbGet = async (sql, params) => {
    const [rows] = await db.query(sql, params);
    return rows[0];
  };
  dbAll = async (sql, params) => {
    const [rows] = await db.query(sql, params);
    return rows;
  };
  dbRun = async (sql, params) => {
    const [result] = await db.query(sql, params);
    return result;
  };
} else {
  const sqlite3 = require('sqlite3').verbose();
  const util = require('util');
  dbGet = util.promisify(db.get.bind(db));
  dbAll = util.promisify(db.all.bind(db));
  dbRun = util.promisify(db.run.bind(db));
}

/**
 * Send all scheduled messages that are due.
 */
async function sendScheduledMessages() {
  let globalSent = 0;
  let globalFailed = 0;
  try {
    logger.debug('📨 Starting scheduled message check...');
    
    // Get all scheduled messages that are due
    const scheduledMessages = await dbAll(
      process.env.DB_TYPE === 'mysql'
        ? "SELECT * FROM messages WHERE status = 'scheduled'"
        : "SELECT * FROM messages WHERE status = 'scheduled'",
      []
    );

    // Filter messages that are actually due based on 'scheduled_for'
    const now = new Date();
    const dueMessages = scheduledMessages.filter(msg => {
      return msg.scheduled_for && new Date(msg.scheduled_for) <= now;
    });

    if (dueMessages.length === 0) {
      logger.debug('✅ No scheduled messages ready to send.');
      return;
    }

    logger.debug(`📬 Found ${dueMessages.length} scheduled message(s) to send.`);

    for (const message of dueMessages) {
      logger.debug(`➡️ Attempting to send message ID: ${message.id}`);

      // Retrieve recipients for the scheduled message
      const recipients = await dbAll(
        `SELECT * FROM message_recipients WHERE message_id = ? AND delivery_status = 'pending'`,
        [message.id]
      );

      if (recipients.length === 0) {
        logger.debug(`⚠️ No recipients found for message ID: ${message.id}. Skipping.`);
        continue;
      }

      logger.debug('📬 Attempting to get sender info...');
      let senderInfo;
      try {
        senderInfo = await getSenderInfo(db);
      } catch (error) {
        logger.error('⚠️ Could not retrieve sender info. Skipping sending.', error);
        continue;
      }
      logger.debug('Sender info:', senderInfo);
      if (!senderInfo) {
        logger.error('⚠️ Could not retrieve sender info. Skipping sending.');
        continue;
      }

      const sendResults = [];

      for (const recipient of recipients) {
        try {
          const htmlContent = recipient.language === 'lt' ? message.body_lt : message.body_en;

          const sendResult = await resend.emails.send({
            from: senderInfo,
            to: recipient.email,
            subject: message.subject,
            html: htmlContent,
          });

          // Check if the send result has data (success) or error (failure)
          if (sendResult && sendResult.data) {
            logger.info(`Email successfully sent to ${recipient.email}`);
            // Update the status to 'sent' and store the message ID
            await dbRun(
              `UPDATE message_recipients SET delivery_status = ?, resend_message_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              ['sent', sendResult.data.id, recipient.id]
            );
            sendResults.push({ recipientId: recipient.id, status: 'sent' });
            globalSent++;
          } else {
            // Handle failure
            const errorMessage = sendResult && sendResult.error ? sendResult.error.message : 'Unknown error';
            logger.error(`Failed to send email to ${recipient.email}. Status: ${sendResult ? sendResult.status : 'undefined'}`);
            logger.error('Send result:', sendResult);
            // Store the error in the database
            await dbRun(
              `UPDATE message_recipients SET delivery_status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              ['failed', errorMessage, recipient.id]
            );

            sendResults.push({ recipientId: recipient.id, status: 'failed' });
            globalFailed++;
          }

          // Add a delay to avoid rate limit
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

        } catch (sendError) {
          logger.error('⚠️ Send failed for recipient', recipient.id, sendError);
          await dbRun(
            `UPDATE message_recipients SET delivery_status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            ['failed', JSON.stringify(sendError), recipient.id]
          );
          sendResults.push({ recipientId: recipient.id, status: 'failed' });
          globalFailed++;
        }
      }

      await dbRun(
        `UPDATE messages SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        ['sent', message.id]
      );

      logger.debug(`✅ Finished sending message ID: ${message.id}. Results:`, sendResults);
    }
    logger.debug(`📝 Scheduler summary: processed ${globalSent + globalFailed} deliveries — ${globalSent} sent, ${globalFailed} failed.`);
  } catch (err) {
    logger.error('❌ Error in sendScheduledMessages:', err);
  }
}

module.exports = {
  sendScheduledMessages,
};