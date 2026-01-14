/**
 * Date Formatting Utility
 * Unified date formatting functions with DST-aware timezone handling
 * Uses Intl.DateTimeFormat with explicit timezone to automatically handle
 * daylight saving time transitions (winter/summer time)
 */

const DEFAULT_TIMEZONE = 'Europe/Amsterdam';
const ENABLE_LOGS = import.meta.env.VITE_ENABLE_LOGS === 'true';

/**
 * Get ordinal suffix for day (1st, 2nd, 3rd, 4th, etc.)
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
 * Format date with ordinal suffix (e.g., "May 1st 2026")
 * Used specifically for rsvpDeadline
 * @param {Date} dateObj - Date object
 * @param {string} timeZone - Timezone
 * @returns {string} Formatted date string (e.g., "May 1st 2026")
 */
function formatDateWithOrdinal(dateObj, timeZone) {
  const monthFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'long'
  });
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    day: 'numeric'
  });
  const yearFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric'
  });
  
  const month = monthFormatter.format(dateObj);
  const day = parseInt(dayFormatter.format(dateObj), 10);
  const year = yearFormatter.format(dateObj);
  const suffix = getOrdinalSuffix(day);
  
  return `${month} ${day}${suffix} ${year}`;
}

/**
 * Format date day first without ordinal (e.g., "1 May 2026")
 * @param {Date} dateObj - Date object
 * @param {string} timeZone - Timezone
 * @returns {string} Formatted date string (e.g., "1 May 2026")
 */
function formatDateDayFirst(dateObj, timeZone) {
  const monthFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'long'
  });
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    day: 'numeric'
  });
  const yearFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric'
  });
  
  const month = monthFormatter.format(dateObj);
  const day = parseInt(dayFormatter.format(dateObj), 10);
  const year = yearFormatter.format(dateObj);
  
  return `${day} ${month} ${year}`;
}

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
 * @returns {string} Formatted date string (e.g., "1 May 2026 23:00")
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
    const datePart = formatDateDayFirst(dateObj, timeZone);
    
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone, // Automatically handles DST transitions
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const timePart = timeFormatter.format(dateObj);
    
    return `${datePart} ${timePart}`;
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
 * @returns {string} Formatted date string (e.g., "1 May 2026")
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
    return formatDateDayFirst(dateObj, timeZone);
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
 * @returns {string} Formatted date string (e.g., "May 1st 2026")
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
    return formatDateWithOrdinal(dateObj, timeZone);
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

