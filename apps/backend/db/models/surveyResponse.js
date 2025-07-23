// apps/backend/db/models/surveyResponse.js
// SurveyResponse model with:
// - driver-agnostic query wrapper
// - schema-based validation
// - JSON-safe response payloads (arrays/objects -> stringified)
// - soft-delete helpers (deleted_at)
// - loud errors on unknown fields
// - convenience aggregators

'use strict';

const getDb = require('../connection');

// --------------------------------------------------
// Query wrapper (mysql2 <-> sqlite3 normalizer)
// --------------------------------------------------
async function query(sql, params = []) {
  const db = getDb();

  // mysql2/promise
  if (typeof db.query === 'function') {
    return db.query(sql, params);
  }

  // sqlite3 verbose
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
// Helpers
// --------------------------------------------------
function parseRow(row) {
  if (!row) return row;
  // try to parse JSON-ish responses
  if (typeof row.response_text === 'string') {
    const txt = row.response_text.trim();
    if ((txt.startsWith('[') && txt.endsWith(']')) || (txt.startsWith('{') && txt.endsWith('}'))) {
      try {
        row.response_text = JSON.parse(txt);
      } catch {
        // leave as string
      }
    }
  }
  return row;
}

function parseRows(rows) {
  return rows.map(parseRow);
}

// --------------------------------------------------
// Field schema
// --------------------------------------------------
const FIELD_DEFS = {
  survey_block_id: {
    modes: ['create', 'update'],
    validate(v) {
      if (!Number.isInteger(v) || v <= 0) throw new Error('"survey_block_id" must be a positive integer.');
      return v;
    },
  },
  guest_id: {
    modes: ['create', 'update'],
    validate(v) {
      if (v == null) return null;
      if (!Number.isInteger(v) || v <= 0) throw new Error('"guest_id" must be a positive integer or null.');
      return v;
    },
  },
  response_text: {
    modes: ['create', 'update'],
    validate(v) {
      // Allow string, array, or object (we'll stringify non-strings)
      if (v == null) return '';
      if (typeof v === 'string') return v;
      if (Array.isArray(v) || (v && typeof v === 'object')) return JSON.stringify(v);
      throw new Error('"response_text" must be a string, array, or object.');
    },
  },
  responded_at: {
    modes: ['create', 'update'],
    validate(v) {
      if (v == null) return new Date();
      const d = new Date(v);
      if (isNaN(d.getTime())) throw new Error('"responded_at" must be a valid date.');
      return d;
    },
  },
  created_at: { modes: [], validate: (v) => v },
  updated_at: { modes: [], validate: (v) => v },
  deleted_at: { modes: [], validate: (v) => v },
};

function buildPayload(mode, input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Payload must be an object.');
  }

  const allowed = Object.entries(FIELD_DEFS)
    .filter(([, def]) => def.modes.includes(mode))
    .map(([k]) => k);

  const payload = {};
  const unknown = [];

  for (const [key, val] of Object.entries(input)) {
    if (!allowed.includes(key)) {
      unknown.push(key);
      continue;
    }
    payload[key] = FIELD_DEFS[key].validate(val);
  }

  if (unknown.length) {
    throw new Error(`Unknown/unsupported field(s) for ${mode}: ${unknown.join(', ')}`);
  }

  if (mode === 'create') {
    if (payload.survey_block_id == null) throw new Error('"survey_block_id" is required.');
    if (payload.response_text == null) payload.response_text = '';
    if (payload.responded_at == null) payload.responded_at = new Date();
  }

  if (Object.keys(payload).length === 0) {
    throw new Error(`No valid fields provided for ${mode}.`);
  }

  return payload;
}

// --------------------------------------------------
// Core model
// --------------------------------------------------
const SurveyResponse = {
  async getById(id, { includeDeleted = false } = {}) {
    if (!id) throw new Error('SurveyResponse ID is required.');
    const where = includeDeleted ? 'id = ?' : 'id = ? AND deleted_at IS NULL';
    const [rows] = await query(`SELECT * FROM survey_responses WHERE ${where}`, [id]);
    return parseRow(rows[0] || null);
  },

  async getResponsesBySurveyId(survey_block_id, { includeDeleted = false } = {}) {
    if (!survey_block_id) throw new Error('survey_block_id is required.');
    const where = includeDeleted
      ? 'survey_block_id = ?'
      : 'survey_block_id = ? AND deleted_at IS NULL';
    const [rows] = await query(
      `SELECT * FROM survey_responses WHERE ${where} ORDER BY responded_at ASC`,
      [survey_block_id]
    );
    return parseRows(rows);
  },

  async create(data = {}) {
    const payload = buildPayload('create', data);
    const now = new Date();

    const keys = Object.keys(payload).concat(['created_at', 'updated_at']);
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(payload).concat([now, now]);

    const [res] = await query(
      `INSERT INTO survey_responses (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    );
    return this.getById(res.insertId);
  },

  async createSurveyResponse(data) {
    const created = await this.create(data);
    return { id: created.id };
  },

  async update(id, updates = {}) {
    if (!id) throw new Error('SurveyResponse ID is required to update.');
    const payload = buildPayload('update', updates);
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.deleted_at;

    const assignments = Object.keys(payload)
      .map((k) => `${k} = ?`)
      .join(', ');
    const values = [...Object.values(payload), id];

    const [res] = await query(
      `UPDATE survey_responses SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    if (res.affectedRows === 0) {
      throw new Error(`No survey response found with id ${id}.`);
    }
    return this.getById(id);
  },

  async softDelete(id) {
    if (!id) throw new Error('SurveyResponse ID is required to delete.');
    const [res] = await query(
      'UPDATE survey_responses SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    return res.affectedRows || 0;
  },

  async restore(id) {
    if (!id) throw new Error('SurveyResponse ID is required to restore.');
    const [res] = await query(
      'UPDATE survey_responses SET deleted_at = NULL WHERE id = ?',
      [id]
    );
    return res.affectedRows || 0;
  },

  async destroy(id) {
    const [res] = await query('DELETE FROM survey_responses WHERE id = ?', [id]);
    return res.affectedRows || 0;
  },

  // Simple aggregation helpers
  async countByOption(survey_block_id) {
    const rows = await this.getResponsesBySurveyId(survey_block_id);
    const tally = {};
    for (const r of rows) {
      const val = r.response_text;
      if (Array.isArray(val)) {
        val.forEach((v) => (tally[v] = (tally[v] || 0) + 1));
      } else if (typeof val === 'string') {
        tally[val] = (tally[val] || 0) + 1;
      }
    }
    return tally;
  },
};

module.exports = {
  getById: SurveyResponse.getById.bind(SurveyResponse),
  getResponsesBySurveyId: SurveyResponse.getResponsesBySurveyId.bind(SurveyResponse),
  createSurveyResponse: SurveyResponse.createSurveyResponse.bind(SurveyResponse),
  create: SurveyResponse.create.bind(SurveyResponse),
  update: SurveyResponse.update.bind(SurveyResponse),
  softDelete: SurveyResponse.softDelete.bind(SurveyResponse),
  restore: SurveyResponse.restore.bind(SurveyResponse),
  destroy: SurveyResponse.destroy.bind(SurveyResponse),
  countByOption: SurveyResponse.countByOption.bind(SurveyResponse),

  _SurveyResponse: SurveyResponse,
};