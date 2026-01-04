/**
 * Send RSVP confirmation email using template system
 * Consolidated helper function for sending confirmation emails to guests
 */

const logger = require('./logger');
const { sendEmail } = require('./emailService');
const { generateEmailHTML } = require('../utils/emailTemplates');
const { getTemplateVariables, replaceTemplateVars } = require('../utils/templateVariables');
const { resolveTemplateSubject } = require('../utils/subjectResolver');

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
    const template = await dbGet("SELECT * FROM templates WHERE name = ?", [templateName]);
    if (!template) {
      logger.error(`Failed to load template: ${templateName}`);
      return;
    }
    
    // Get enhanced template variables for this guest
    const variables = await getTemplateVariables(guestData, template);
    
    // Determine language
    const lang = guestData.preferred_language === 'lt' ? 'lt' : 'en';
    const bodyTemplate = lang === 'lt' ? template.body_lt : template.body_en;
    
    // Resolve subject with fallback logic
    const subjectTemplate = resolveTemplateSubject(template, lang, {
      context: 'rsvp_confirmation',
      rsvpStatus: guestData.rsvp_status
    });
    
    // Replace variables in template content
    const subject = replaceTemplateVars(subjectTemplate, variables);
    const body = replaceTemplateVars(bodyTemplate, variables);
    
    // Prepare email template options from settings
    const emailOptions = {
      siteUrl: variables.websiteUrl || variables.siteUrl || process.env.SITE_URL || 'http://localhost:5001',
      title: variables.brideName && variables.groomName 
        ? `${variables.brideName} & ${variables.groomName}`
        : undefined
    };
    
    // Apply email template styling
    const styleKey = template.style || 'elegant';
    const emailHtml = generateEmailHTML(body, styleKey, emailOptions);
    
    // Send via unified email service
    const result = await sendEmail({
      to: guestData.email,
      subject: subject,
      html: emailHtml,
      db
    });
    
    if (result.success) {
      logger.info("[SEND_CONFIRMATION_EMAIL] Sent", { guestCode: guestData.code, messageId: result.messageId });
    } else {
      logger.error("[SEND_CONFIRMATION_EMAIL] Failed", { guestCode: guestData.code, error: result.error });
    }
  } catch (e) {
    logger.error("[SEND_CONFIRMATION_EMAIL] Error", { guestCode: guestData.code, error: e.message });
    // Don't throw - email failure shouldn't block RSVP submission
  }
}

module.exports = { sendConfirmationEmail };

