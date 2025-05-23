import api from './index';

/**
 * Fetch RSVP analytics (counts by status).
 * @returns {Promise<Object>} stats object
 */
// fetch guest analytics and return only the response payload
export function fetchGuestAnalytics() {
  return api.get(
    '/guests/analytics',
    { meta: { showLoader: true } }
  )
  .then(res => res.data)
}
