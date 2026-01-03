/**
 * Send RSVP confirmation email using template system
 * Consolidated helper function for sending confirmation emails to guests
 */

const resendClient = require('./resendClient');
const logger = require('./logger');
const getSenderInfo = require('./getSenderInfo');
const { generateEmailHTML } = require('../utils/emailTemplates');
const { getTemplateVariables, replaceTemplateVars } = require('../utils/templateVariables');

/**
 * Send confirmation email to guest after RSVP submission
 * @param {Object} db - Database connection
 * @param {Object} guestData - Guest data object with email, rsvp_status, preferred_language, etc.
 */
async function sendConfirmationEmail(db, guestData) {
  try {
    // Check if guest has email
    if (!guestData.email) {
      logger.warn(`Guest ${guestData.code} has no email, skipping confirmation email`);
      return;
    }
    
    // Create dbGet helper function using the same pattern as route files
    let dbGet;
    if (process.env.DB_TYPE === 'mysql') {
      dbGet = async (sql, params) => {
        const [rows] = await db.query(sql, params);
        return rows[0];
      };
    } else {
      const sqlite3 = require('sqlite3').verbose();
      const util = require('util');
      dbGet = util.promisify(db.get.bind(db));
    }
    
    // Fetch sender info
    const senderInfo = await getSenderInfo(db);
    
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
    let subjectTemplate = lang === 'lt' ? template.subject_lt : template.subject_en;
    const bodyTemplate = lang === 'lt' ? template.body_lt : template.body_en;
    
    // Fallback 1: Check for old schema with single 'subject' column
    if ((!subjectTemplate || subjectTemplate.trim() === '') && template.subject) {
      subjectTemplate = template.subject;
      logger.info(`Template "${templateName}" using legacy 'subject' column`);
    }
    
    // Fallback 2: If still missing, use a default based on RSVP status
    if (!subjectTemplate || subjectTemplate.trim() === '') {
      if (guestData.rsvp_status === 'attending') {
        subjectTemplate = lang === 'lt' 
          ? 'Ačiū už jūsų RSVP, {{guestName}}!' 
          : 'Thank you for your RSVP, {{guestName}}!';
      } else if (guestData.rsvp_status === 'not_attending') {
        subjectTemplate = lang === 'lt'
          ? 'Ačiū už jūsų RSVP, {{guestName}}'
          : 'Thank you for your RSVP, {{guestName}}';
      } else {
        subjectTemplate = lang === 'lt'
          ? 'Ačiū už jūsų RSVP, {{guestName}}!'
          : 'Thank you for your RSVP, {{guestName}}!';
      }
      logger.warn(`Template "${templateName}" missing subject_${lang}, using fallback`);
    }
    
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
    
    // Send via Resend
    const response = await resendClient.emails.send({
      from: senderInfo,
      to: guestData.email,
      subject: subject,
      html: emailHtml
    });
    
    logger.info("RSVP confirmation email sent:", response.data);
  } catch (e) {
    logger.error("Error in sendConfirmationEmail:", e);
    // Don't throw - email failure shouldn't block RSVP submission
  }
}

module.exports = { sendConfirmationEmail };

