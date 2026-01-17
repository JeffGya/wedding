import api from './index';

/**
 * Fetch message statistics grouped by type
 * @param {Object} options - Pagination options
 * @param {number} [options.page_custom=1] - Page for custom messages
 * @param {number} [options.page_rsvpAttending=1] - Page for RSVP attending
 * @param {number} [options.page_rsvpNotAttending=1] - Page for RSVP not attending
 * @param {number} [options.limit=10] - Items per page
 * @returns {Promise<Object>} Message stats grouped by type
 */
export function fetchMessageStatsByType(options = {}) {
  const params = new URLSearchParams();
  if (options.page_custom) params.append('page_custom', options.page_custom);
  if (options.page_rsvpAttending) params.append('page_rsvpAttending', options.page_rsvpAttending);
  if (options.page_rsvpNotAttending) params.append('page_rsvpNotAttending', options.page_rsvpNotAttending);
  if (options.limit) params.append('limit', options.limit);
  
  return api.get(
    `/message-stats/by-type?${params.toString()}`,
    { meta: { showLoader: true } }
  )
  .then(res => res.data.data)
}
