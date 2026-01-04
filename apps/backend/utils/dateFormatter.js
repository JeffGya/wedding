/**
 * Date Formatting Utility
 * Unified date formatting functions with logging for debugging
 */

const logger = require('../helpers/logger');

/**
 * Format date with time (for guest lists, RSVP deadlines with time)
 * @param {string|Date|null} dateString - Date string or Date object
 * @returns {string} Formatted date string (e.g., "December 25, 2024, 18:00")
 */
function formatDateWithTime(dateString) {
  if (!dateString) {
    return '';
  }
  
  try {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    return new Date(dateString).toLocaleString('en-US', options);
  } catch (error) {
    logger.warn('[DATE_FORMATTER] Error formatting date with time', { input: dateString, error: error.message });
    return '';
  }
}

/**
 * Format date without time (for templates, template variables)
 * @param {string|Date|null} dateString - Date string or Date object
 * @returns {string} Formatted date string (e.g., "December 25, 2024")
 */
function formatDateWithoutTime(dateString) {
  if (!dateString) {
    return '';
  }
  
  try {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  } catch (error) {
    logger.warn('[DATE_FORMATTER] Error formatting date without time', { input: dateString, error: error.message });
    return '';
  }
}

/**
 * Format RSVP deadline date (same as formatDateWithoutTime, but with specific logging)
 * @param {string|Date|null} dateString - Date string or Date object
 * @returns {string} Formatted date string (e.g., "November 1, 2024")
 */
function formatRsvpDeadline(dateString) {
  if (!dateString) {
    return '';
  }
  
  try {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  } catch (error) {
    logger.warn('[DATE_FORMATTER] Error formatting RSVP deadline', { input: dateString, error: error.message });
    return '';
  }
}

module.exports = {
  formatDateWithTime,
  formatDateWithoutTime,
  formatRsvpDeadline
};

