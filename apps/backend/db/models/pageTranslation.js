// models/pageTranslation.js
// This model handles all interactions with the `page_translations` table,
// which stores language-specific content for each page (one row per language per page).

const getDb = require('../connection');
const db = getDb();

/**
 * Get all translations for a given page ID
 * @param {number} pageId - The ID of the page
 * @returns {Promise<Array>} - Array of translation objects for this page
 */
async function getTranslationsByPageId(pageId) {
  const [rows] = await db.query('SELECT * FROM page_translations WHERE page_id = ?', [pageId]);
  return rows;
}

/**
 * Get a single translation for a page in a specific language
 * @param {number} pageId - The ID of the page
 * @param {string} lang - Language code (e.g. 'en', 'lt')
 * @returns {Promise<Object|null>} - The translation object or null if not found
 */
async function getTranslationByPageIdAndLang(pageId, lang) {
  const [rows] = await db.query(
    'SELECT * FROM page_translations WHERE page_id = ? AND locale = ? LIMIT 1',
    [pageId, lang]
  );
  return rows[0] || null;
}

/**
 * Get a single translation by page ID and locale (alias for getTranslationByPageIdAndLang)
 * @param {number} pageId - The ID of the page
 * @param {string} locale - The locale (e.g., 'en')
 * @returns {Promise<Object|null>} - The translation object or null
 */
async function getByPageIdAndLocale(pageId, locale) {
  return await getTranslationByPageIdAndLang(pageId, locale);
}

/**
 * Create a new translation (alias for createTranslation)
 * @param {Object} translation - Translation data: { page_id, locale, title, content }
 * @returns {Promise<Object>} - The inserted translation with ID
 */
async function create(translation) {
  const db = getDb();
  const { page_id, locale, title, content } = translation;
  const now = new Date();

  if (!locale) {
    throw new Error('Missing locale in translation payload');
  }

  console.log('[PageTranslation.create] Creating translation with values:');
  console.log('  page_id:', page_id);
  console.log('  locale:', locale);
  console.log('  title:', title);
  console.log('  content:', content);

  const [result] = await db.query(
    `INSERT INTO page_translations (page_id, locale, title, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [page_id, locale, title, JSON.stringify(content), now, now]
  );

  console.log('  ✅ Insert result:', result);

  return {
    id: result.insertId,
    page_id,
    locale,
    title,
    content
  };
}

/**
 * Create a new translation for a page
 * @param {Object} translation - Translation data: { page_id, locale, title, content }
 * @returns {Promise<number>} - ID of the inserted translation
 */
async function createTranslation({ page_id, locale, title, content }) {
  const [result] = await db.query(
    'INSERT INTO page_translations (page_id, locale, title, content) VALUES (?, ?, ?, ?)',
    [page_id, locale, title, JSON.stringify(content)]
  );
  return result.insertId;
}

/**
 * Update an existing translation
 * @param {number} id - ID of the translation row
 * @param {Object} updates - Updated fields: { title, content }
 * @returns {Promise<number>} - Number of rows updated (should be 1)
 */
async function updateTranslation(id, updates) {
  const fields = [];
  const values = [];

  if ('title' in updates) {
    fields.push('title = ?');
    values.push(updates.title);
  }
  if ('content' in updates) {
    fields.push('content = ?');
    values.push(JSON.stringify(updates.content));
  }

  if (fields.length === 0) return 0;

  values.push(id);
  const [result] = await db.query(`UPDATE page_translations SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
  return result.affectedRows;
}

/**
 * Delete a translation by ID
 * @param {number} id - ID of the translation to delete
 * @returns {Promise<number>} - Number of rows deleted (should be 1)
 */
async function deleteTranslation(id) {
  const [result] = await db.query('DELETE FROM page_translations WHERE id = ?', [id]);
  return result.affectedRows;
}

async function upsertTranslation({ page_id, locale, title, content }) {
  const existing = await getTranslationByPageIdAndLang(page_id, locale);
  if (existing) {
    await updateTranslation(existing.id, { title, content });
    return existing.id;
  } else {
    return await createTranslation({ page_id, locale, title, content });
  }
}

/**
 * Delete all translations for a given page
 * @param {number} pageId - The ID of the page
 * @returns {Promise<number>} - Number of rows deleted
 */
async function deleteAllByPageId(pageId) {
  const [result] = await db.query('DELETE FROM page_translations WHERE page_id = ?', [pageId]);
  return result.affectedRows;
}

/**
 * Alias for updateTranslation — updates translation by ID
 * @param {number} id - Translation ID
 * @param {Object} updates - Fields to update: { title, content }
 * @returns {Promise<number>} - Number of rows affected
 */
async function update(id, updates) {
  return await updateTranslation(id, updates);
}

module.exports = {
  getTranslationsByPageId,
  getTranslationByPageIdAndLang,
  createTranslation,
  updateTranslation,
  deleteTranslation,
  create,
  upsertTranslation,
  deleteAllByPageId,
  getByPageIdAndLocale,
  update,
};