import api from './index';

/**
 * Fetch all pages (admin)
 * @returns {Promise<Array>} Array of page objects
 */
export async function fetchPages() {
  const { data } = await api.get('/admin/pages', {
    meta: { showLoader: true }
  });
  // The API returns pages under `data.data`
  return data.data;
}

/**
 * Fetch a single page by ID (admin)
 * @param {number} id - Page ID
 * @returns {Promise<Object>} Page object
 */
export async function fetchPage(id) {
  const { data } = await api.get(`/admin/pages/${id}`, {
    meta: { showLoader: true }
  });
  // Support both wrapped and unwrapped responses
  return data.data ?? data;
}

/**
 * Create a new page (admin)
 * @param {Object} payload - Page data
 * @param {string} payload.slug - Page slug
 * @param {boolean} payload.is_published - Published status
 * @param {boolean} payload.requires_rsvp - RSVP requirement
 * @param {boolean} payload.show_in_nav - Show in navigation
 * @param {number} payload.nav_order - Navigation order
 * @param {string|null} [payload.header_image_url] - Header background image URL
 * @param {Array} payload.translations - Page translations
 * @returns {Promise<Object>} Created page object
 */
export async function createPage(payload) {
  const { data } = await api.post('/admin/pages', payload, {
    meta: { showLoader: true }
  });
  return data;
}

/**
 * Update an existing page (admin)
 * @param {number} id - Page ID
 * @param {Object} payload - Updated page data
 * @param {string} [payload.slug] - Page slug
 * @param {boolean} [payload.is_published] - Published status
 * @param {boolean} [payload.requires_rsvp] - RSVP requirement
 * @param {boolean} [payload.show_in_nav] - Show in navigation
 * @param {number} [payload.nav_order] - Navigation order
 * @param {string|null} [payload.header_image_url] - Header background image URL
 * @param {Array} [payload.translations] - Page translations
 * @returns {Promise<Object>} Updated page object
 */
export async function updatePage(id, payload) {
  const { data } = await api.put(`/admin/pages/${id}`, payload, {
    meta: { showLoader: true }
  });
  return data;
}

/**
 * Delete a page (admin)
 * @param {number} id - Page ID
 * @returns {Promise<boolean>} True if deletion succeeded
 */
export async function deletePage(id) {
  await api.delete(`/admin/pages/${id}`, {
    meta: { showLoader: true }
  });
  return true;
}

/**
 * Fetch translations for a page (admin)
 * @param {number} pageId
 * @returns {Promise<Array>} Array of translations
 */
export async function fetchTranslations(pageId) {
  const { data } = await api.get(`/admin/pages/${pageId}/translations`, {
    meta: { showLoader: true }
  });
  // Supports either `data.translations` or `data.data` wrapper
  return data.translations ?? data.data;
}

/**
 * Create or update a translation for a page (admin)
 * @param {number} pageId
 * @param {string} locale - Locale code ('en'|'lt')
 * @param {Object} payload - Translation payload { title, content }
 * @returns {Promise<Object>} Translation object
 */
export async function saveTranslation(pageId, locale, payload) {
  const { data } = await api.post(`/admin/pages/${pageId}/translations/${locale}`, payload, {
    meta: { showLoader: true }
  });
  return data;
}

/**
 * Fetch surveys for a page (admin)
 * @param {number} pageId
 * @returns {Promise<Array>} Array of survey block objects
 */
export async function fetchSurveys(pageId) {
  const { data } = await api.get(`/admin/pages/${pageId}/surveys`, {
    meta: { showLoader: true }
  });
  // Supports either `data.surveys` or `data.data`
  return data.surveys ?? data.data;
}

/**
 * Create a survey block on a page (admin)
 * @param {number} pageId
 * @param {Object} payload - Survey block data
 * @returns {Promise<Object>} Created survey block object
 */
export async function createSurvey(pageId, payload) {
  const { data } = await api.post(`/admin/pages/${pageId}/surveys`, payload, {
    meta: { showLoader: true }
  });
  return data;
}

/**
 * Update a survey block (admin)
 * @param {number} surveyId
 * @param {Object} payload - Updated survey data
 * @returns {Promise<Object>} Updated survey block object
 */
export async function updateSurvey(surveyId, payload) {
  const { data } = await api.put(`/admin/surveys/${surveyId}`, payload, {
    meta: { showLoader: true }
  });
  return data;
}

/**
 * Delete a survey block (admin)
 * @param {number} surveyId
 * @returns {Promise<boolean>}
 */
export async function deleteSurvey(surveyId) {
  await api.delete(`/admin/surveys/${surveyId}`, {
    meta: { showLoader: true }
  });
  return true;
}

/**
 * Fetch a public list of published pages (for nav)
 * @param {string} locale - Locale code
 * @returns {Promise<Array>} Array of page objects
 */
export async function fetchPublicPages(locale) {
  const { data } = await api.get('/pages', {
    params: { locale },
    meta: { showLoader: true }
  });
  // The public list comes back under `data.data`
  return data.data;
}

/**
 * Fetch a public page by slug
 * @param {string} slug
 * @param {string} locale
 * @param {boolean} withSurveys
 * @returns {Promise<Object>} Page DTO with blocks
 * @returns {string} returns.slug - Page slug
 * @returns {string} returns.locale - Page locale
 * @returns {string} returns.title - Page title
 * @returns {string|null} returns.header_image_url - Header background image URL
 * @returns {Array} returns.content - Page content blocks
 */
export async function fetchPublicPage(slug, locale, withSurveys = false) {
  const { data } = await api.get(`/pages/${slug}`, {
    params: { locale, withSurveys },
    meta: { showLoader: true }
  });
  return data;
}
/**
 * Fetch all survey blocks (admin).
 */
export async function fetchAllSurveys() {
  const { data } = await api.get('/admin/surveys', {
    meta: { showLoader: true }
  });
  // Supports either `data.surveys` or paginated `data.data`
  return data.surveys ?? data.data;
}

/**
 * Fetch a single survey block (admin).
 */
export async function fetchSurvey(id) {
  const { data } = await api.get(`/admin/surveys/${id}`, {
    meta: { showLoader: true }
  });
  // Support data under data.data, data.survey, or direct data payload
  return data.data ?? data.survey ?? data;
}

/**
 * Fetch responses for a survey block (admin).
 */
export async function fetchSurveyResponses(id) {
  const { data } = await api.get(`/admin/surveys/${id}/responses`, {
    meta: { showLoader: true }
  });
  // Supports either `data.responses` or `data.data`
  return data.responses ?? data.data;
}