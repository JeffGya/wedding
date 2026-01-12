/**
 * Unified Email Generation Service
 * Consolidates all email generation logic from messages, templates, RSVP, etc.
 */

const logger = require('./logger');
const { generateEmailHTML } = require('../utils/emailTemplates');
const { getTemplateVariables, replaceTemplateVars } = require('../utils/templateVariables');
const { resolveTemplateSubject } = require('../utils/subjectResolver');
const { getSectionTranslations, getTranslation } = require('../utils/emailLocale');
const SITE_URL = process.env.SITE_URL || 'http://localhost:5001';

/**
 * Prepare template options from variables and message/template
 * @param {Object} variables - Template variables
 * @param {Object} messageOrTemplate - Message or template object
 * @param {string} language - Language code ('en' or 'lt')
 * @returns {Object} Template options
 */
function prepareTemplateOptions(variables, messageOrTemplate = {}, language = 'en') {
  const lang = language === 'lt' ? 'lt' : 'en';
  const footerTranslations = getSectionTranslations('footer', lang);
  const infoCardTranslations = getSectionTranslations('infoCard', lang);

  const options = {
    siteUrl: variables.websiteUrl || variables.siteUrl || SITE_URL,
    title: variables.brideName && variables.groomName 
      ? `${variables.brideName} & ${variables.groomName}`
      : undefined,
    footerText: footerTranslations.signoff || 'With love and joy,',
    preheaderText: footerTranslations.preheader || "We can't wait to celebrate with you",
    language: lang
  };

  // Auto-populate info card from template variables if available
  // Only include fields that have actual values (not empty/null/undefined)
  // InfoCard should only show content filled in the settings
  const infoCard = {};
  
  // Date: only show if weddingDate exists and is not empty
  if (variables.weddingDate && typeof variables.weddingDate === 'string' && variables.weddingDate.trim() !== '') {
    infoCard.date = {
      label: infoCardTranslations.date || 'Date',
      value: variables.weddingDate
    };
  }
  
  // Location: only show if we have venueName OR venueAddress (both must be non-empty strings)
  const hasVenueName = variables.venueName && typeof variables.venueName === 'string' && variables.venueName.trim() !== '';
  const hasVenueAddress = variables.venueAddress && typeof variables.venueAddress === 'string' && variables.venueAddress.trim() !== '';
  if (hasVenueName || hasVenueAddress) {
    let locationValue = '';
    if (hasVenueName && hasVenueAddress) {
      locationValue = `${variables.venueName}, ${variables.venueAddress}`;
    } else if (hasVenueName) {
      locationValue = variables.venueName;
    } else if (hasVenueAddress) {
      locationValue = variables.venueAddress;
    }
    // Only add if we have a valid location value
    if (locationValue && locationValue.trim() !== '') {
      infoCard.location = {
        label: infoCardTranslations.location || 'Location',
        value: locationValue
      };
    }
  }
  
  // Time: only show if eventTime exists and is not empty
  if (variables.eventTime && typeof variables.eventTime === 'string' && variables.eventTime.trim() !== '') {
    infoCard.time = {
      label: infoCardTranslations.time || 'Time',
      value: variables.eventTime
    };
  }

  // Only add infoCard if it has at least one field
  if (Object.keys(infoCard).length > 0) {
    options.infoCard = infoCard;
  }

  // Add RSVP code if available
  if (variables.code || variables.rsvpCode) {
    options.rsvpCode = variables.code || variables.rsvpCode;
  }
  
  return options;
}

/**
 * Get email content from message or template
 * @param {Object} messageOrTemplate - Message or template object
 * @param {Object} guest - Guest object
 * @param {string} language - Language code ('en' or 'lt')
 * @returns {Object} Object with subject and body
 */
async function getEmailContent(messageOrTemplate, guest, language) {
  const lang = language || guest?.preferred_language || 'en';
  const isLt = lang === 'lt';

  let subject = '';
  let body = '';

  if (messageOrTemplate) {
    // Handle subject (could be single field or separate en/lt)
    if (messageOrTemplate.subject_en && messageOrTemplate.subject_lt) {
      subject = isLt ? messageOrTemplate.subject_lt : messageOrTemplate.subject_en;
    } else if (messageOrTemplate.subject) {
      subject = messageOrTemplate.subject;
    }

    // Handle body (should have both en and lt)
    body = isLt 
      ? (messageOrTemplate.body_lt || messageOrTemplate.body_en || '')
      : (messageOrTemplate.body_en || '');
  }

  return { subject, body, language: lang };
}

/**
 * Generate email for a guest from content
 * @param {Object} guest - Guest object
 * @param {string} content - Email content (body)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Email object with to, subject, html, guestId, language
 */
async function generateEmailForGuest(guest, content, options = {}) {
  try {
    // Get template variables
    const variables = await getTemplateVariables(guest, options.message || options.template || null);

    // Replace variables in content
    const processedContent = replaceTemplateVars(content, variables);

    // Determine language first
    const lang = guest?.preferred_language === 'lt' ? 'lt' : 'en';

    // Prepare template options with language
    const templateOptions = prepareTemplateOptions(variables, options.message || options.template || {}, lang);
    
    // Merge with provided options (provided options take precedence)
    const finalOptions = {
      ...templateOptions,
      ...options,
      language: lang,
      // Don't override auto-populated infoCard/rsvpCode unless explicitly provided
      infoCard: options.infoCard !== undefined ? options.infoCard : templateOptions.infoCard,
      rsvpCode: options.rsvpCode !== undefined ? options.rsvpCode : templateOptions.rsvpCode
    };

    // Generate email HTML
    const styleKey = options.style || (options.message?.style || options.template?.style) || 'elegant';
    const emailHtml = generateEmailHTML(processedContent, styleKey, finalOptions);

    return {
      to: guest?.email,
      subject: options.subject || '',
      html: emailHtml,
      guestId: guest?.id,
      language: lang
    };
  } catch (error) {
    logger.error('[EMAIL_GEN] Error in email generation', { 
      error: error.message, 
      stack: error.stack, 
      context: { guestId: guest?.id, guestCode: guest?.code, step: 'generateEmailForGuest' } 
    });
    throw error;
  }
}

/**
 * Generate email from template
 * @param {Object} template - Template object
 * @param {Object} guest - Guest object
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Email object with to, subject, html, guestId, language
 */
async function generateEmailFromTemplate(template, guest, options = {}) {
  try {
    // Get email content
    const { subject: subjectTemplate, body, language } = await getEmailContent(template, guest, options.language);
    
    // Get template variables
    const variables = await getTemplateVariables(guest, template);
    
    // Replace variables in subject and body
    const subject = replaceTemplateVars(subjectTemplate, variables);
    const processedBody = replaceTemplateVars(body, variables);

    // Prepare template options with language
    const templateOptions = prepareTemplateOptions(variables, template, language);
    
    // Merge with provided options
    const finalOptions = {
      ...templateOptions,
      ...options,
      subject,
      language,
      infoCard: options.infoCard !== undefined ? options.infoCard : templateOptions.infoCard,
      rsvpCode: options.rsvpCode !== undefined ? options.rsvpCode : templateOptions.rsvpCode
    };

    // Generate email HTML
    const styleKey = options.style || template?.style || 'elegant';
    const emailHtml = generateEmailHTML(processedBody, styleKey, finalOptions);

    return {
      to: guest?.email,
      subject: subject,
      html: emailHtml,
      guestId: guest?.id,
      language: language
    };
  } catch (error) {
    logger.error('[EMAIL_GEN] Error generating email from template', { 
      error: error.message, 
      stack: error.stack, 
      context: { templateId: template?.id, guestId: guest?.id, step: 'generateEmailFromTemplate' } 
    });
    throw error;
  }
}

/**
 * Generate email from message
 * @param {Object} message - Message object
 * @param {Object} guest - Guest object
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Email object with to, subject, html, guestId, language
 */
async function generateEmailFromMessage(message, guest, options = {}) {
  try {
    // Get email content
    const { subject: subjectTemplate, body, language } = await getEmailContent(message, guest, options.language);
    
    // Get template variables
    const variables = await getTemplateVariables(guest, message);
    
    // Replace variables in subject and body
    const subject = replaceTemplateVars(subjectTemplate, variables);
    const processedBody = replaceTemplateVars(body, variables);

    // Prepare template options with language
    const templateOptions = prepareTemplateOptions(variables, message, language);
    
    // Merge with provided options
    const finalOptions = {
      ...templateOptions,
      ...options,
      subject,
      language,
      infoCard: options.infoCard !== undefined ? options.infoCard : templateOptions.infoCard,
      rsvpCode: options.rsvpCode !== undefined ? options.rsvpCode : templateOptions.rsvpCode
    };

    // Generate email HTML
    const styleKey = options.style || message?.style || 'elegant';
    const emailHtml = generateEmailHTML(processedBody, styleKey, finalOptions);

    return {
      to: guest?.email,
      subject: subject,
      html: emailHtml,
      guestId: guest?.id,
      language: language
    };
  } catch (error) {
    logger.error('[EMAIL_GEN] Error generating email from message', { 
      error: error.message, 
      stack: error.stack, 
      context: { messageId: message?.id, guestId: guest?.id, step: 'generateEmailFromMessage' } 
    });
    throw error;
  }
}

module.exports = {
  generateEmailForGuest,
  generateEmailFromTemplate,
  generateEmailFromMessage,
  prepareTemplateOptions,
  getEmailContent
};

