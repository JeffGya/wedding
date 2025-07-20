// db/models/surveyResponse.js
// Handles storing and retrieving responses to survey blocks

const getDb = require('../connection');

async function getResponsesBySurveyId(surveyBlockId) {
  const db = getDb();
  try {
    const [rows] = await db.query(
      'SELECT * FROM survey_responses WHERE survey_block_id = ?',
      [surveyBlockId]
    );
    return rows;
  } catch (err) {
    console.error('❌ Error fetching survey responses:', err);
    throw err;
  }
}

async function createSurveyResponse({ survey_block_id, guest_id, response_text }) {
  const db = getDb();
  try {
    const [result] = await db.query(
      'INSERT INTO survey_responses (survey_block_id, guest_id, response_text) VALUES (?, ?, ?)',
      [survey_block_id, guest_id, response_text]
    );
    return { id: result.insertId };
  } catch (err) {
    console.error('❌ Error inserting survey response:', err);
    throw err;
  }
}

module.exports = {
  getResponsesBySurveyId,
  createSurveyResponse,
};