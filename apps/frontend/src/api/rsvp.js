import api from './index';

/**
 * Fetch a guest by their RSVP code.
 * @param {string} code
 * @returns {Promise<Object>} guest object
 */
export async function fetchGuestByCode(code) {
  const { data } = await api.get(
    `/rsvp/${code}`,
    {
      meta: { showLoader: true },
      withCredentials: true
    }
  );
  return data.guest;
}

/**
 * Submit an RSVP payload for a guest.
 * @param {Object} payload
 * @returns {Promise<Object>} response data
 */
export async function submitGuestRSVP(payload) {
  const { data } = await api.post(
    '/rsvp',
    payload,
    {
      meta: { showLoader: true },
      withCredentials: true
    }
  );
  return data.success;
}

/**
 * Fetch current RSVP session info (requires a valid session cookie)
 * @returns {Promise<Object>} auth info, including the RSVP code
 */
export async function fetchRSVPSession() {
  const { data } = await api.get(
    '/rsvp/session',
    {
      meta: { showLoader: true },
      withCredentials: true
    }
  );
  return data.auth;
}