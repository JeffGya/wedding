const getDbConnection = require('../db/connection');
const { createDbHelpers } = require('../db/queryHelpers');
const logger = require('./logger');
const { sendEmail } = require('./emailService');
const { generateEmailFromMessage } = require('../helpers/emailGeneration');

const db = getDbConnection();
const { dbGet, dbAll, dbRun } = createDbHelpers(db);
const SITE_URL = process.env.SITE_URL || 'http://localhost:5001';

/**
 * Send all scheduled messages that are due.
 */
async function sendScheduledMessages() {
  let globalSent = 0;
  let globalFailed = 0;
  try {
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
      return;
    }

    for (const message of dueMessages) {

      // Retrieve recipients for the scheduled message (including rate_limited ones)
      const recipients = await dbAll(
        `SELECT * FROM message_recipients WHERE message_id = ? AND (delivery_status = 'pending' OR delivery_status = 'rate_limited')`,
        [message.id]
      );

      if (recipients.length === 0) {
        continue;
      }


      const sendResults = [];

      for (const recipient of recipients) {
        try {
          // Get guest data for template variables
          const Guest = require('../db/models/guest');
          const guest = await Guest.findById(recipient.guest_id);
          if (!guest) {
            logger.warn('[SCHEDULED_MESSAGES] Guest not found', { recipientId: recipient.id, guestId: recipient.guest_id });
            await dbRun(
              `UPDATE message_recipients SET delivery_status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              ['failed', 'Guest not found', recipient.id]
            );
            sendResults.push({ recipientId: recipient.id, status: 'failed' });
            globalFailed++;
            continue;
          }

          // Check for missing email
          if (!recipient.email) {
            logger.warn('[SCHEDULED_MESSAGES] Missing email', { recipientId: recipient.id });
            await dbRun(
              `UPDATE message_recipients SET delivery_status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              ['failed', 'Missing email address', recipient.id]
            );
            sendResults.push({ recipientId: recipient.id, status: 'failed' });
            globalFailed++;
            continue;
          }

          const lang = recipient.language === 'lt' ? 'lt' : 'en';
          
          // Use unified email generation service
          const emailData = await generateEmailFromMessage(message, guest, {
            style: message.style || 'elegant',
            language: lang
          });

          // Send via unified email service
          const result = await sendEmail({
            to: recipient.email,
            subject: emailData.subject,
            html: emailData.html,
            db
          });

          if (result.success) {
            // Update the status to 'sent' and store the message ID
            await dbRun(
              `UPDATE message_recipients SET delivery_status = ?, resend_message_id = ?, sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              ['sent', result.messageId, recipient.id]
            );
            sendResults.push({ recipientId: recipient.id, status: 'sent' });
            globalSent++;
          } else {
            // Check if error is due to rate limiting
            const isRateLimit = result.error && (
              result.error.includes('429') || 
              result.error.toLowerCase().includes('rate limit') ||
              result.error.toLowerCase().includes('too many requests')
            );
            
            if (isRateLimit) {
              logger.warn('[SCHEDULED_MESSAGES] Rate limited, marking for retry', { to: recipient.email, recipientId: recipient.id });
              // Mark as rate_limited for retry in next scheduler run
              await dbRun(
                `UPDATE message_recipients SET delivery_status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                ['rate_limited', result.error || 'Rate limited', recipient.id]
              );
              sendResults.push({ recipientId: recipient.id, status: 'rate_limited' });
              // Don't increment failed count - it will be retried
            } else {
              logger.error('[SCHEDULED_MESSAGES] Failed', { to: recipient.email, error: result.error });
              // Store the error in the database
              await dbRun(
                `UPDATE message_recipients SET delivery_status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                ['failed', result.error || 'Unknown error', recipient.id]
              );
              sendResults.push({ recipientId: recipient.id, status: 'failed' });
              globalFailed++;
            }
          }

          // Add a delay to avoid rate limit (reduced to 500ms to stay under 2 req/sec)
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay

        } catch (sendError) {
          logger.error('[SCHEDULED_MESSAGES] Send failed', { recipientId: recipient.id, error: sendError.message });
          await dbRun(
            `UPDATE message_recipients SET delivery_status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            ['failed', sendError.message || JSON.stringify(sendError), recipient.id]
          );
          sendResults.push({ recipientId: recipient.id, status: 'failed' });
          globalFailed++;
        }
      }

      await dbRun(
        `UPDATE messages SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        ['sent', message.id]
      );
    }
    
    // Only log summary if there were messages processed or failures
    if (globalSent > 0 || globalFailed > 0) {
      logger.info('[SCHEDULED_MESSAGES] Summary', { sent: globalSent, failed: globalFailed });
    }
  } catch (err) {
    logger.error('❌ Error in sendScheduledMessages:', err);
  }
}

module.exports = {
  sendScheduledMessages,
};