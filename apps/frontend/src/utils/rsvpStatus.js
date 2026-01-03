/**
 * RSVP Status Utilities
 * Consolidated logic for converting and displaying RSVP status values
 */

/**
 * Convert attending boolean to rsvp_status string
 * @param {boolean|null|undefined} attending
 * @returns {string} - 'attending', 'not_attending', or 'pending'
 */
export function convertAttendingToRsvpStatus(attending) {
  if (attending === true) return 'attending';
  if (attending === false) return 'not_attending';
  return 'pending';
}

/**
 * Get display label for RSVP status based on attending value
 * @param {boolean|number|null|undefined} attending
 * @returns {string} - 'Yes', 'No', or 'Pending'
 */
export function getRSVPStatusLabel(attending) {
  if (attending === true || attending === 1) return 'Yes';
  if (attending === false || attending === 0) return 'No';
  return 'Pending';
}

/**
 * Get PrimeVue Tag severity for RSVP status
 * @param {boolean|number|null|undefined} attending
 * @returns {string} - 'success', 'danger', or 'warning'
 */
export function getRSVPSeverity(attending) {
  if (attending === true || attending === 1) return 'success';
  if (attending === false || attending === 0) return 'danger';
  return 'warning';
}


