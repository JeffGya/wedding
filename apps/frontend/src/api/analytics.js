import api from './index';

/**
 * Fetch RSVP analytics (counts by status).
 * @returns {Promise<Object>} stats object
 */
export async function fetchGuestAnalytics() {
  const { data } = await api.get('/guests/analytics');
  return data.stats;
}
