/**
 * Send RSVP confirmation email using template system
 * Consolidated helper function for sending confirmation emails to guests
 */

const logger = require('./logger');
const { sendEmail } = require('./emailService');
const { generateEmailFromTemplate, getEmailContent } = require('../helpers/emailGeneration');
const { normalizeTemplateSubjects } = require('../utils/subjectResolver');
const { getTemplateVariables, replaceTemplateVars } = require('../utils/templateVariables');
const { DateTime } = require('luxon');

/**
 * Send confirmation email to guest after RSVP submission
 * @param {Object} db - Database connection
 * @param {Object} guestData - Guest data object with email, rsvp_status, preferred_language, etc.
 */
async function sendConfirmationEmail(db, guestData) {
  try {
    // Check if guest has email
    if (!guestData.email) {
      logger.warn(`[SEND_CONFIRMATION_EMAIL] Guest ${guestData.code} has no email, skipping`);
      return;
    }
    
    // Create db helpers
    const { createDbHelpers } = require('../db/queryHelpers');
    const { dbGet, dbRun } = createDbHelpers(db);
    
    // Determine which template to use based on RSVP status
    let templateName;
    if (guestData.rsvp_status === 'attending') {
      templateName = 'Thank You - Attending';
    } else if (guestData.rsvp_status === 'not_attending') {
      templateName = 'Thank You - Not Attending';
    } else {
      // Fallback for pending status
      templateName = 'Thank You - Attending';
    }
    
    // Fetch the appropriate template
    const rawTemplate = await dbGet("SELECT * FROM templates WHERE name = ?", [templateName]);
    if (!rawTemplate) {
      logger.error(`[SEND_CONFIRMATION_EMAIL] Failed to load template: ${templateName}`);
      return;
    }
    
    // Normalize template subjects (handles both new and old schemas)
    const template = normalizeTemplateSubjects(rawTemplate);
    
    // Determine RSVP type for marker
    const rsvpType = guestData.rsvp_status === 'attending' ? 'attending' : 'not_attending';
    const marker = `<!-- RSVP_CONFIRMATION_TYPE:${rsvpType} -->`;
    
    // Generate email for guest's preferred language (for sending)
    const emailData = await generateEmailFromTemplate(template, guestData, {
      style: template.style || 'elegant'
    });
    
    // Get email content for both languages (for message record)
    
    const emailContentEn = await getEmailContent(template, guestData, 'en');
    const emailContentLt = await getEmailContent(template, guestData, 'lt');
    
    // Get template variables for both languages
    const variablesEn = await getTemplateVariables(guestData, template, 'en');
    const variablesLt = await getTemplateVariables(guestData, template, 'lt');
    
    // Replace variables in subjects and bodies
    const subjectEn = replaceTemplateVars(emailContentEn.subject, variablesEn);
    const subjectLt = replaceTemplateVars(emailContentLt.subject, variablesLt);
    const bodyEn = replaceTemplateVars(emailContentEn.body, variablesEn);
    const bodyLt = replaceTemplateVars(emailContentLt.body, variablesLt);
    
    // Add marker to bodies
    const bodyEnWithMarker = marker + '\n' + bodyEn;
    const bodyLtWithMarker = marker + '\n' + (bodyLt || bodyEn);
    
    // Send via unified email service
    const result = await sendEmail({
      to: guestData.email,
      subject: emailData.subject,
      html: emailData.html,
      db
    });
    
    if (result.success) {
      // Create message record in database for tracking
      try {
        const subjectJson = JSON.stringify({ en: subjectEn, lt: subjectLt });
        const insertResult = await dbRun(
          `INSERT INTO messages (subject, body_en, body_lt, status) VALUES (?, ?, ?, 'sent')`,
          [subjectJson, bodyEnWithMarker, bodyLtWithMarker]
        );
        const messageId = process.env.DB_TYPE === 'mysql' ? insertResult.insertId : insertResult.lastID;
        
        // Create message_recipients record
        const sentAt = DateTime.utc().toFormat('yyyy-MM-dd HH:mm:ss');
        await dbRun(
          `INSERT INTO message_recipients (message_id, guest_id, email, language, delivery_status, sent_at, status, resend_message_id) 
           VALUES (?, ?, ?, ?, 'sent', ?, 'sent', ?)`,
          [messageId, guestData.id, guestData.email, emailData.language || 'en', sentAt, result.messageId]
        );
        
        logger.info("[SEND_CONFIRMATION_EMAIL] Sent and tracked", { 
          guestCode: guestData.code, 
          messageId: result.messageId,
          dbMessageId: messageId
        });
      } catch (dbError) {
        // Log but don't fail - email was sent successfully
        logger.error("[SEND_CONFIRMATION_EMAIL] Failed to track message in database", { 
          guestCode: guestData.code,
          error: dbError.message,
          stack: dbError.stack
        });
      }
    } else {
      logger.error("[SEND_CONFIRMATION_EMAIL] Failed", { guestCode: guestData.code, error: result.error });
    }
  } catch (e) {
    logger.error("[SEND_CONFIRMATION_EMAIL] Error", { 
      guestCode: guestData.code, 
      error: e.message,
      stack: e.stack
    });
    // Don't throw - email failure shouldn't block RSVP submission
  }
}

module.exports = { sendConfirmationEmail };

