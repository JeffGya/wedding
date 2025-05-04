import api from './index';

/**
 * Fetch a guest by their RSVP code.
 * @param {string} code
 * @returns {Promise<Object>} guest object
 */
export async function fetchGuestByCode(code) {
  const { data } = await api.get(`/rsvp/${code}`);
  return data.guest;
}

/**
 * Submit an RSVP payload for a guest.
 * @param {Object} payload
 * @returns {Promise<Object>} response data
 */
export async function submitGuestRSVP(payload) {
  const { data } = await api.post('/rsvp', payload);
  return data;
}