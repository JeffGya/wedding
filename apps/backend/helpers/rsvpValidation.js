/**
 * RSVP Validation Service
 * Centralized validation logic for RSVP endpoints
 */

const logger = require('./logger');

/**
 * Validate RSVP input types and required fields
 * @param {Object} data - Request body data
 * @param {Object} options - Validation options
 * @param {boolean} options.requireCode - Whether code is required
 * @param {boolean} options.requireAttending - Whether attending is required
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
function validateRsvpInput(data, options = {}) {
  const { requireCode = false, requireAttending = false } = options;
  const errors = [];

  // Validate code if required
  if (requireCode && !data.code) {
    errors.push('Code is required');
  }

  // Validate attending if required
  if (requireAttending) {
    if (typeof data.attending === 'undefined') {
      errors.push('attending is required');
    } else if (typeof data.attending !== 'boolean') {
      errors.push('attending must be a boolean');
    }
  } else if (typeof data.attending !== 'undefined' && typeof data.attending !== 'boolean') {
    // If attending is provided but not required, still validate type
    errors.push('attending must be a boolean');
  }

  // Validate optional string fields
  if (data.plus_one_name !== undefined && data.plus_one_name !== null && typeof data.plus_one_name !== 'string') {
    errors.push('plus_one_name must be a string');
  }

  if (data.dietary !== undefined && data.dietary !== null && typeof data.dietary !== 'string') {
    errors.push('dietary must be a string');
  }

  if (data.notes !== undefined && data.notes !== null && typeof data.notes !== 'string') {
    errors.push('notes must be a string');
  }

  if (data.plus_one_dietary !== undefined && data.plus_one_dietary !== null && typeof data.plus_one_dietary !== 'string') {
    errors.push('plus_one_dietary must be a string');
  }

  const isValid = errors.length === 0;

  return { isValid, errors };
}

/**
 * Validate RSVP business rules
 * @param {Object} guest - Guest record from database
 * @param {Object} data - Request body data
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
function validateRsvpBusinessRules(guest, data) {
  const errors = [];

  // Validate plus-one permission
  if (data.plus_one_name && !guest.can_bring_plus_one) {
    errors.push('This guest is not allowed a plus one');
  }

  // Validate RSVP deadline
  if (guest.rsvp_deadline) {
    const deadlineCheck = validateRsvpDeadline(guest.rsvp_deadline);
    if (deadlineCheck.hasPassed) {
      errors.push(deadlineCheck.error);
    }
  }

  const isValid = errors.length === 0;

  return { isValid, errors };
}

/**
 * Validate if RSVP deadline has passed
 * @param {string|Date} rsvpDeadline - RSVP deadline date
 * @returns {Object} { hasPassed: boolean, error: string | null }
 */
function validateRsvpDeadline(rsvpDeadline) {
  if (!rsvpDeadline) {
    return { hasPassed: false, error: null };
  }

  const deadline = new Date(rsvpDeadline);
  const now = new Date();

  if (isNaN(deadline.getTime())) {
    logger.warn('[RSVP_VALIDATION] Invalid deadline format', { rsvpDeadline });
    return { hasPassed: false, error: null };
  }

  const hasPassed = deadline < now;

  return {
    hasPassed,
    error: hasPassed ? 'RSVP deadline has passed' : null
  };
}

module.exports = {
  validateRsvpInput,
  validateRsvpBusinessRules,
  validateRsvpDeadline
};

