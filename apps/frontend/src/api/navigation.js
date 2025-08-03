

import api from './index';

/**
 * Fetch navigation pages ordered by nav_order.
 * @param {string} locale - The locale for titles (e.g., 'en', 'lt').
 * @returns {Promise<Array<{ slug: string, title: string, order: number }>>}
 */
export async function fetchNavigation(locale = 'en') {
  const response = await api.get('/pages/navigation', {
    params: { locale },
  });
  return response.data;
}