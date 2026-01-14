/**
 * Send RSVP confirmation email using template system
 * Consolidated helper function for sending confirmation emails to guests
 */

const logger = require('./logger');
const { sendEmail } = require('./emailService');
const { generateEmailFromTemplate } = require('../helpers/emailGeneration');
const { normalizeTemplateSubjects } = require('../utils/subjectResolver');

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
    
    // Create dbGet helper function
    const { createDbHelpers } = require('../db/queryHelpers');
    const { dbGet } = createDbHelpers(db);
    
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
    
    // Use unified email generation service
    const emailData = await generateEmailFromTemplate(template, guestData, {
      style: template.style || 'elegant'
    });
    
    // Send via unified email service
    const result = await sendEmail({
      to: guestData.email,
      subject: emailData.subject,
      html: emailData.html,
      db
    });
    
    if (result.success) {
      logger.info("[SEND_CONFIRMATION_EMAIL] Sent", { guestCode: guestData.code, messageId: result.messageId });
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

