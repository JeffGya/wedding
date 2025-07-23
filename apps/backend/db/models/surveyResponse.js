// apps/backend/db/models/surveyResponse.js
// Lightweight model aligned with other models (pages, surveyBlock)
// Provides: create, getBySurveyId, deleteBySurveyId, getAllByGuest, getAllBySurvey, destroyByGuest, etc.

'use strict';

const getDb = require('../connection');

// --------------------------------------------------
// Query wrapper (mysql2 / sqlite3)
// --------------------------------------------------
async function query(sql, params = []) {
  const db = getDb();

  // mysql2 promise
  if (typeof db.query === 'function') {
    return db.query(sql, params);
  }

  // sqlite3
  return new Promise((resolve, reject) => {
    const trimmed = sql.trim().toLowerCase();
    const isSelect = trimmed.startsWith('select');
    const isInsert = trimmed.startsWith('insert');

    if (isSelect) {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve([rows]);
      });
    } else if (isInsert) {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve([{ insertId: this.lastID }]);
      });
    } else {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve([{ affectedRows: this.changes }]);
      });
    }
  });
}

// --------------------------------------------------
// Helpers / validation
// --------------------------------------------------
function ensureInt(val, name) {
  if (!Number.isInteger(val) || val <= 0) throw new Error(`${name} must be positive integer`);
  return val;
}

function normalizeResponse(resp) {
  // Store as stringified JSON to be safe for checkboxes (array) and text/radio (string)
  if (Array.isArray(resp)) return JSON.stringify(resp);
  if (typeof resp === 'object' && resp !== null) return JSON.stringify(resp);
  if (typeof resp === 'string') return resp;
  return String(resp ?? '');
}

// Name of the response column in DB.
// We recently switched to `response_text` in code. If your DB still has `response`,
// either add a migration to rename, or change this constant to 'response'.
const RESPONSE_COL = 'response_text';

// --------------------------------------------------
// Model
// --------------------------------------------------
const SurveyResponse = {

  async create({ survey_block_id, guest_id = null, response_text }) {
    ensureInt(survey_block_id, 'survey_block_id');

    const respValue = normalizeResponse(response_text);

    const now = new Date();
    const cols = ['survey_block_id', 'guest_id', RESPONSE_COL, 'created_at'];
    const placeholders = cols.map(() => '?').join(', ');
    const values = [survey_block_id, guest_id, respValue, now];

    const [res] = await query(
      `INSERT INTO survey_responses (${cols.join(', ')}) VALUES (${placeholders})`,
      values
    );
    return this.getById(res.insertId);
  },

  async getById(id) {
    ensureInt(id, 'id');
    const [rows] = await query(`SELECT * FROM survey_responses WHERE id = ?`, [id]);
    return rows[0] || null;
  },

  async getAllBySurvey(survey_block_id) {
    ensureInt(survey_block_id, 'survey_block_id');
    const [rows] = await query(
      `SELECT * FROM survey_responses WHERE survey_block_id = ? ORDER BY created_at DESC`,
      [survey_block_id]
    );
    return rows;
  },

  async getAllByGuest(guest_id) {
    ensureInt(guest_id, 'guest_id');
    const [rows] = await query(
      `SELECT * FROM survey_responses WHERE guest_id = ? ORDER BY created_at DESC`,
      [guest_id]
    );
    return rows;
  },

  async deleteBySurveyId(survey_block_id) {
    ensureInt(survey_block_id, 'survey_block_id');
    const [res] = await query(
      `DELETE FROM survey_responses WHERE survey_block_id = ?`,
      [survey_block_id]
    );
    return res.affectedRows || 0;
  },

  async destroyByGuest(guest_id) {
    ensureInt(guest_id, 'guest_id');
    const [res] = await query(
      `DELETE FROM survey_responses WHERE guest_id = ?`,
      [guest_id]
    );
    return res.affectedRows || 0;
  },
};

module.exports = {
  create: SurveyResponse.create.bind(SurveyResponse),
  getById: SurveyResponse.getById.bind(SurveyResponse),
  getAllBySurvey: SurveyResponse.getAllBySurvey.bind(SurveyResponse),
  getAllByGuest: SurveyResponse.getAllByGuest.bind(SurveyResponse),
  deleteBySurveyId: SurveyResponse.deleteBySurveyId.bind(SurveyResponse),
  destroyByGuest: SurveyResponse.destroyByGuest.bind(SurveyResponse),
  _SurveyResponse: SurveyResponse,
};