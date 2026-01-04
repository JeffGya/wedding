/**
 * Date Formatting Utility
 * Unified date formatting functions with DST-aware timezone handling
 * Uses Intl.DateTimeFormat with explicit timezone to automatically handle
 * daylight saving time transitions (winter/summer time)
 */

const DEFAULT_TIMEZONE = 'Europe/Amsterdam';
const ENABLE_LOGS = import.meta.env.VITE_ENABLE_LOGS === 'true';

/**
 * Normalize date string to ISO format for consistent parsing
 * Handles both "YYYY-MM-DD HH:mm:ss" and ISO formats
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {Date|null} Parsed Date object or null if invalid
 */
function normalizeDate(dateInput) {
  if (!dateInput) return null;
  
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  
  if (typeof dateInput === 'string') {
    // Handle "YYYY-MM-DD HH:mm:ss" format (common from backend)
    let iso = dateInput.trim();
    if (!/[Zz]|[+\-]\d{2}:\d{2}$/.test(iso)) {
      // Convert "YYYY-MM-DD HH:mm:ss" to "YYYY-MM-DDTHH:mm:ssZ"
      iso = iso.replace(' ', 'T') + 'Z';
    }
    const dateObj = new Date(iso);
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }
  
  return null;
}

/**
 * Format date with time (for guest lists, RSVP deadlines with time)
 * Matches backend formatDateWithTime signature
 * @param {string|Date|null} dateString - Date string or Date object
 * @param {Object} options - Optional formatting options
 * @param {string} options.timeZone - Timezone (default: 'Europe/Amsterdam')
 * @returns {string} Formatted date string (e.g., "December 25, 2024, 18:00")
 */
export function formatDateWithTime(dateString, options = {}) {
  if (!dateString) {
    return '';
  }
  
  try {
    const dateObj = normalizeDate(dateString);
    if (!dateObj) {
      return '';
    }
    
    const timeZone = options.timeZone || DEFAULT_TIMEZONE;
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone, // Automatically handles DST transitions
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    return formatter.format(dateObj);
  } catch (error) {
    if (ENABLE_LOGS) {
      console.warn('[DATE_FORMATTER] Error formatting date with time', {
        input: dateString,
        error: error.message
      });
    }
    return '';
  }
}

/**
 * Format date without time (for templates, template variables)
 * Matches backend formatDateWithoutTime signature
 * @param {string|Date|null} dateString - Date string or Date object
 * @param {Object} options - Optional formatting options
 * @param {string} options.timeZone - Timezone (default: 'Europe/Amsterdam')
 * @returns {string} Formatted date string (e.g., "December 25, 2024")
 */
export function formatDateWithoutTime(dateString, options = {}) {
  if (!dateString) {
    return '';
  }
  
  try {
    const dateObj = normalizeDate(dateString);
    if (!dateObj) {
      return '';
    }
    
    const timeZone = options.timeZone || DEFAULT_TIMEZONE;
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone, // Automatically handles DST transitions
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    return formatter.format(dateObj);
  } catch (error) {
    if (ENABLE_LOGS) {
      console.warn('[DATE_FORMATTER] Error formatting date without time', {
        input: dateString,
        error: error.message
      });
    }
    return '';
  }
}

/**
 * Format date with time in short format (2-digit month/day)
 * @param {string|Date|null} dateString - Date string or Date object
 * @param {Object} options - Optional formatting options
 * @param {string} options.timeZone - Timezone (default: 'Europe/Amsterdam')
 * @returns {string} Formatted date string (e.g., "12/25/2024, 18:00")
 */
export function formatDateTimeShort(dateString, options = {}) {
  if (!dateString) {
    return '';
  }
  
  try {
    const dateObj = normalizeDate(dateString);
    if (!dateObj) {
      return '';
    }
    
    const timeZone = options.timeZone || DEFAULT_TIMEZONE;
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone, // Automatically handles DST transitions
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    return formatter.format(dateObj);
  } catch (error) {
    if (ENABLE_LOGS) {
      console.warn('[DATE_FORMATTER] Error formatting date time short', {
        input: dateString,
        error: error.message
      });
    }
    return '';
  }
}

/**
 * Format date with time in long format (full month name)
 * Similar to formatDateWithTime but with consistent naming
 * @param {string|Date|null} dateString - Date string or Date object
 * @param {Object} options - Optional formatting options
 * @param {string} options.timeZone - Timezone (default: 'Europe/Amsterdam')
 * @returns {string} Formatted date string (e.g., "December 25, 2024, 18:00")
 */
export function formatDateTimeLong(dateString, options = {}) {
  // Same as formatDateWithTime, but with explicit naming
  return formatDateWithTime(dateString, options);
}

/**
 * Format RSVP deadline date (same as formatDateWithoutTime, but with specific logging)
 * Matches backend formatRsvpDeadline signature
 * @param {string|Date|null} dateString - Date string or Date object
 * @param {Object} options - Optional formatting options
 * @param {string} options.timeZone - Timezone (default: 'Europe/Amsterdam')
 * @returns {string} Formatted date string (e.g., "November 1, 2024")
 */
export function formatRsvpDeadline(dateString, options = {}) {
  if (!dateString) {
    return '';
  }
  
  try {
    const dateObj = normalizeDate(dateString);
    if (!dateObj) {
      return '';
    }
    
    const timeZone = options.timeZone || DEFAULT_TIMEZONE;
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone, // Automatically handles DST transitions
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    return formatter.format(dateObj);
  } catch (error) {
    if (ENABLE_LOGS) {
      console.warn('[DATE_FORMATTER] Error formatting RSVP deadline', {
        input: dateString,
        error: error.message
      });
    }
    return '';
  }
}

