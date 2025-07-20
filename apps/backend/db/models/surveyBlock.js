
const getDb = require('../connection');

/**
 * Create a new survey block
 * @param {Object} data - Survey block data
 * @returns {Promise<Object>} Newly created survey block
 */
async function createSurveyBlock(data) {
  const db = getDb();
  const [result] = await db.query(
    'INSERT INTO survey_blocks (page_id, locale, question, type, options, is_required, is_anonymous) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      data.page_id,
      data.locale,
      data.question,
      data.type,
      JSON.stringify(data.options || []),
      data.is_required,
      data.is_anonymous
    ]
  );
  return getSurveyBlockById(result.insertId);
}

/**
 * Get a survey block by ID
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
async function getSurveyBlockById(id) {
  const db = getDb();
  const [rows] = await db.query('SELECT * FROM survey_blocks WHERE id = ?', [id]);
  return rows[0] || null;
}

/**
 * Get all survey blocks for a specific page
 * @param {number} pageId
 * @returns {Promise<Array>}
 */
async function getSurveyBlocksByPageId(pageId) {
  const db = getDb();
  const [rows] = await db.query('SELECT * FROM survey_blocks WHERE page_id = ? ORDER BY block_order', [pageId]);
  return rows;
}

module.exports = {
  createSurveyBlock,
  getSurveyBlockById,
  getSurveyBlocksByPageId
};