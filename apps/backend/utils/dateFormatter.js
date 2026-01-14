/**
 * Date Formatting Utility
 * Unified date formatting functions with language support (English and Lithuanian)
 */

const logger = require('../helpers/logger');

/**
 * Lithuanian month names (genitive case for dates)
 */
const LITHUANIAN_MONTHS = [
  'sausio',      // January
  'vasario',      // February
  'kovo',        // March
  'balandžio',   // April
  'gegužės',     // May
  'birželio',    // June
  'liepos',      // July
  'rugpjūčio',   // August
  'rugsėjo',     // September
  'spalio',      // October
  'lapkričio',   // November
  'gruodžio'     // December
];

/**
 * Get ordinal suffix for day (1st, 2nd, 3rd, 4th, etc.) - English only
 * @param {number} day - Day of month
 * @returns {string} Ordinal suffix
 */
function getOrdinalSuffix(day) {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
}

/**
 * Get month name in the specified language
 * @param {Date} date - Date object
 * @param {string} language - Language code ('en' or 'lt')
 * @returns {string} Month name
 */
function getMonthName(date, language = 'en') {
  if (language === 'lt') {
    return LITHUANIAN_MONTHS[date.getMonth()];
  }
  // Default to English
  return date.toLocaleString('en-US', { month: 'long' });
}

/**
 * Format date with ordinal suffix (e.g., "May 1st" or "gegužės 1 d.")
 * Used specifically for rsvpDeadline
 * @param {string|Date|null} dateString - Date string or Date object
 * @param {string} language - Language code ('en' or 'lt'), defaults to 'en'
 * @returns {string} Formatted date string (without year)
 * English: "May 1st" (month day ordinal)
 * Lithuanian: "gegužės 1 d." (month day d.)
 */
function formatDateWithOrdinal(dateString, language = 'en') {
  if (!dateString) {
    return '';
  }
  
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    
    if (language === 'lt') {
      // Lithuanian: format as "gegužės 1 d." (month day d., no year)
      const month = getMonthName(date, 'lt');
      const formatted = `${month} ${day} d.`;
      return formatted;
    }
    
    // English: with ordinal suffix, format as "May 1st" (no year)
    const month = getMonthName(date, 'en');
    const suffix = getOrdinalSuffix(day);
    const formatted = `${month} ${day}${suffix}`;
    return formatted;
  } catch (error) {
    logger.warn('[DATE_FORMATTER] Error formatting date with ordinal', { input: dateString, error: error.message });
    return '';
  }
}

/**
 * Format date day first without ordinal (e.g., "1 May" or "1 gegužės")
 * @param {string|Date|null} dateString - Date string or Date object
 * @param {string} language - Language code ('en' or 'lt'), defaults to 'en'
 * @returns {string} Formatted date string (without year)
 */
function formatDateDayFirst(dateString, language = 'en') {
  if (!dateString) {
    return '';
  }
  
  try {
    const date = new Date(dateString);
    const month = getMonthName(date, language);
    const day = date.getDate();
    const formatted = `${day} ${month}`;
    return formatted;
  } catch (error) {
    logger.warn('[DATE_FORMATTER] Error formatting date day first', { input: dateString, error: error.message });
    return '';
  }
}

/**
 * Format date with time (for guest lists, RSVP deadlines with time)
 * @param {string|Date|null} dateString - Date string or Date object
 * @param {string} language - Language code ('en' or 'lt'), defaults to 'en'
 * @returns {string} Formatted date string (e.g., "1 May 23:00" or "1 gegužės 23:00", without year)
 */
function formatDateWithTime(dateString, language = 'en') {
  if (!dateString) {
    return '';
  }
  
  try {
    const date = new Date(dateString);
    const month = getMonthName(date, language);
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const formatted = `${day} ${month} ${hours}:${minutes}`;
    return formatted;
  } catch (error) {
    logger.warn('[DATE_FORMATTER] Error formatting date with time', { input: dateString, error: error.message });
    return '';
  }
}

/**
 * Format date without time (for templates, template variables)
 * @param {string|Date|null} dateString - Date string or Date object
 * @param {string} language - Language code ('en' or 'lt'), defaults to 'en'
 * @returns {string} Formatted date string
 */
function formatDateWithoutTime(dateString, language = 'en') {
  return formatDateDayFirst(dateString, language);
}

/**
 * Format RSVP deadline date (uses ordinal format for English, regular format for Lithuanian)
 * @param {string|Date|null} dateString - Date string or Date object
 * @param {string} language - Language code ('en' or 'lt'), defaults to 'en'
 * @returns {string} Formatted date string
 */
function formatRsvpDeadline(dateString, language = 'en') {
  return formatDateWithOrdinal(dateString, language);
}

module.exports = {
  formatDateWithTime,
  formatDateWithoutTime,
  formatRsvpDeadline
};

