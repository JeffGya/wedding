/**
 * Subject Resolution Utility
 * Unified logic for resolving email template subjects with comprehensive fallback support
 * Handles both new schema (subject_en/subject_lt) and old schema (JSON subject)
 */

const logger = require('../helpers/logger');

/**
 * Resolve template subject with fallback logic
 * @param {Object} template - Template object (may have subject_en, subject_lt, or subject)
 * @param {string} language - Language code ('en' or 'lt')
 * @param {Object} options - Additional options
 * @param {string} [options.context] - Context for fallback ('rsvp_confirmation', 'message', etc.)
 * @param {string} [options.rsvpStatus] - RSVP status for RSVP confirmation fallbacks ('attending', 'not_attending', 'pending')
 * @returns {string} Resolved subject string
 */
function resolveTemplateSubject(template, language, options = {}) {
  const { context, rsvpStatus } = options;
  const lang = language === 'lt' ? 'lt' : 'en';

  // Step 1: Try language-specific column (new schema)
  if (lang === 'lt' && template.subject_lt) {
    const subject = template.subject_lt.trim();
    if (subject) {
      return subject;
    }
  } else if (lang === 'en' && template.subject_en) {
    const subject = template.subject_en.trim();
    if (subject) {
      return subject;
    }
  }

  // Step 2: Fallback to legacy 'subject' column
  if (template.subject) {
    try {
      // Try parsing as JSON (old schema format)
      const subjectData = JSON.parse(template.subject);
      if (subjectData && typeof subjectData === 'object') {
        const subject = (lang === 'lt' ? subjectData.lt : subjectData.en) || subjectData[lang] || template.subject;
        if (subject && subject.trim()) {
          return subject.trim();
        }
      }
    } catch (e) {
      // Not JSON, use as plain text
      const subject = template.subject.trim();
      if (subject) {
        return subject;
      }
    }
  }

  // Step 3: Context-specific fallbacks
  if (context === 'rsvp_confirmation') {
    if (rsvpStatus === 'attending') {
      const fallback = lang === 'lt' 
        ? 'Ačiū už jūsų RSVP, {{guestName}}!' 
        : 'Thank you for your RSVP, {{guestName}}!';
      logger.warn('[SUBJECT_RESOLVER] Fallback to default RSVP attending subject');
      return fallback;
    } else if (rsvpStatus === 'not_attending') {
      const fallback = lang === 'lt'
        ? 'Ačiū už jūsų RSVP, {{guestName}}'
        : 'Thank you for your RSVP, {{guestName}}';
      logger.warn('[SUBJECT_RESOLVER] Fallback to default RSVP not attending subject');
      return fallback;
    } else {
      // Pending status fallback
      const fallback = lang === 'lt'
        ? 'Ačiū už jūsų RSVP, {{guestName}}!'
        : 'Thank you for your RSVP, {{guestName}}!';
      logger.warn('[SUBJECT_RESOLVER] Fallback to default RSVP pending subject');
      return fallback;
    }
  }

  // Step 4: No fallback for other contexts - return empty string
  logger.warn('[SUBJECT_RESOLVER] No subject found, returning empty string', { context, language: lang });
  return '';
}

/**
 * Normalize template subject fields (parse JSON if needed, extract language-specific)
 * This is useful when you have a raw template from the database
 * @param {Object} rawTemplate - Raw template object from database
 * @returns {Object} Template with normalized subject_en and subject_lt fields
 */
function normalizeTemplateSubjects(rawTemplate) {
  let subjectEn = '';
  let subjectLt = '';

  // If new schema columns exist, use them directly
  if (rawTemplate.subject_en || rawTemplate.subject_lt) {
    subjectEn = rawTemplate.subject_en || '';
    subjectLt = rawTemplate.subject_lt || '';
  } else if (rawTemplate.subject) {
    // Try parsing as JSON
    try {
      const subjectData = JSON.parse(rawTemplate.subject);
      if (subjectData && typeof subjectData === 'object') {
        subjectEn = subjectData.en || rawTemplate.subject || '';
        subjectLt = subjectData.lt || rawTemplate.subject || '';
      } else {
        // Not a valid JSON object, use as plain text for both
        subjectEn = rawTemplate.subject;
        subjectLt = rawTemplate.subject;
      }
    } catch (e) {
      // Not JSON, use as plain text for both languages
      subjectEn = rawTemplate.subject;
      subjectLt = rawTemplate.subject;
    }
  }

  return {
    ...rawTemplate,
    subject_en: subjectEn,
    subject_lt: subjectLt,
    subject: subjectEn // Keep backward compatibility with 'subject' field
  };
}

module.exports = {
  resolveTemplateSubject,
  normalizeTemplateSubjects
};

