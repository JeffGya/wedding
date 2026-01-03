/**
 * RSVP Status Conversion Helpers
 * Consolidated logic for converting attending values to rsvp_status strings
 */

/**
 * Normalize attending value from various input types (boolean, string, number)
 * @param {boolean|string|number|null|undefined} attending - Raw attending value
 * @returns {boolean|null} - Normalized boolean or null
 */
function normalizeAttendingValue(attending) {
  if (attending === true || attending === 'true' || attending === 1) return true;
  if (attending === false || attending === 'false' || attending === 0) return false;
  return null;
}

/**
 * Convert attending value to rsvp_status string
 * @param {boolean|string|number|null|undefined} attending - Raw attending value
 * @param {string|null} currentRsvpStatus - Current rsvp_status to preserve if attending not provided
 * @param {boolean} attendingProvided - Whether attending was explicitly provided in request
 * @returns {string} - 'attending', 'not_attending', or 'pending'
 */
function convertAttendingToRsvpStatus(attending, currentRsvpStatus = null, attendingProvided = true) {
  if (!attendingProvided && currentRsvpStatus) {
    return currentRsvpStatus;
  }
  
  const normalized = normalizeAttendingValue(attending);

  if (normalized === true) {
    return 'attending';
  } else if (normalized === false) {
    return 'not_attending';
  } else {
    return 'pending';
  }
}

module.exports = {
  normalizeAttendingValue,
  convertAttendingToRsvpStatus
};

