const getDbConnection = require('../db/connection');
const { createDbHelpers } = require('../db/queryHelpers');
const logger = require('./logger');
const { sendEmail } = require('./emailService');
const { getTemplateVariables, replaceTemplateVars } = require('../utils/templateVariables');
const { generateEmailHTML } = require('../utils/emailTemplates');

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


      const sendResults = [];

      for (const recipient of recipients) {
        try {
          // Get guest data for template variables
          const guest = await dbGet('SELECT * FROM guests WHERE id = ?', [recipient.guest_id]);
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
          
          // Get enhanced variables for this guest
          const variables = await getTemplateVariables(guest, message);
          
          // Replace variables in message content
          const body_en = replaceTemplateVars(message.body_en, variables);
          const body_lt = replaceTemplateVars(message.body_lt, variables);
          const subject = replaceTemplateVars(message.subject, variables);
          
          // Prepare email template options from settings
          const emailOptions = {
            siteUrl: variables.websiteUrl || variables.siteUrl || SITE_URL,
            title: variables.brideName && variables.groomName 
              ? `${variables.brideName} & ${variables.groomName}`
              : undefined
          };
          
          // Apply shared email template system for consistent, inline-styled HTML
          const styleKey = message.style || 'elegant';
          const emailHtml = generateEmailHTML(lang === 'lt' ? body_lt : body_en, styleKey, emailOptions);

          // Send via unified email service
          const result = await sendEmail({
            to: recipient.email,
            subject: subject,
            html: emailHtml,
            db
          });

          if (result.success) {
            logger.info('[SCHEDULED_MESSAGES] Sent', { to: recipient.email, messageId: result.messageId });
            // Update the status to 'sent' and store the message ID
            await dbRun(
              `UPDATE message_recipients SET delivery_status = ?, resend_message_id = ?, sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              ['sent', result.messageId, recipient.id]
            );
            sendResults.push({ recipientId: recipient.id, status: 'sent' });
            globalSent++;
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

          // Add a delay to avoid rate limit
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay

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