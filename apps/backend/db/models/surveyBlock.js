// apps/backend/db/models/surveyBlock.js
// SurveyBlock model with:
// - driver-agnostic query wrapper
// - schema-based validation (question/type/options/etc.)
// - JSON (options) serialization/deserialization
// - soft-delete helpers (deleted_at)
// - loud errors on unknown fields

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
const LOCALE_REGEX = /^[a-z]{2}(-[A-Z]{2})?$/;
const QUESTION_TYPES = new Set(['radio', 'checkbox', 'text']);

function parseRow(row) {
  if (!row) return row;
  if (typeof row.options === 'string') {
    try {
      row.options = JSON.parse(row.options);
    } catch {
      // leave as string if malformed
    }
  }
  return row;
}

function parseRows(rows) {
  return rows.map(parseRow);
}

function validateOptions(type, options) {
  if (type === 'text') {
    // text inputs shouldn't have options
    return [];
  }
  if (!Array.isArray(options)) {
    throw new Error('"options" must be an array for radio/checkbox types.');
  }
  // ensure simple strings (or {value,label})? keep it simple for now
  options.forEach((opt, idx) => {
    if (typeof opt !== 'string') {
      throw new Error(`options[${idx}] must be a string.`);
    }
  });
  return options;
}

// --------------------------------------------------
// Field schema
// --------------------------------------------------
const FIELD_DEFS = {
  page_id: {
    modes: ['create', 'update'],
    validate(v) {
      if (v == null) return null;
      if (!Number.isInteger(v) || v <= 0) throw new Error('"page_id" must be a positive integer or null.');
      return v;
    },
  },
  locale: {
    modes: ['create', 'update'],
    validate(v) {
      if (typeof v !== 'string' || !LOCALE_REGEX.test(v)) {
        throw new Error('"locale" must be a valid code (e.g. "en", "lt").');
      }
      return v;
    },
  },
  question: {
    modes: ['create', 'update'],
    validate(v) {
      if (typeof v !== 'string' || !v.trim()) throw new Error('"question" must be a non-empty string.');
      return v.trim();
    },
  },
  type: {
    modes: ['create', 'update'],
    validate(v) {
      if (typeof v !== 'string' || !QUESTION_TYPES.has(v)) {
        throw new Error(`"type" must be one of: ${Array.from(QUESTION_TYPES).join(', ')}`);
      }
      return v;
    },
  },
  options: {
    modes: ['create', 'update'],
    validate(v, ctx) {
      if (v == null) return ctx.type === 'text' ? [] : [];
      return validateOptions(ctx.type, v);
    },
  },
  is_required: {
    modes: ['create', 'update'],
    validate(v) {
      if (typeof v !== 'boolean') throw new Error('"is_required" must be boolean.');
      return v;
    },
  },
  is_anonymous: {
    modes: ['create', 'update'],
    validate(v) {
      if (typeof v !== 'boolean') throw new Error('"is_anonymous" must be boolean.');
      return v;
    },
  },
  requires_rsvp: {
    modes: ['create', 'update'],
    validate(v) {
      if (typeof v !== 'boolean') throw new Error('"requires_rsvp" must be boolean.');
      return v;
    },
  },
  block_order: {
    modes: ['create', 'update'],
    validate(v) {
      if (v == null) return 0;
      if (!Number.isInteger(v) || v < 0) throw new Error('"block_order" must be a non-negative integer.');
      return v;
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
  // need type to validate options
  const typeCandidate = input.type;

  for (const [key, val] of Object.entries(input)) {
    if (!allowed.includes(key)) {
      unknown.push(key);
      continue;
    }
    // pass a small context so options validator can see type
    payload[key] = FIELD_DEFS[key].validate(val, { type: typeCandidate ?? payload.type });
  }

  if (unknown.length) {
    throw new Error(`Unknown/unsupported field(s) for ${mode}: ${unknown.join(', ')}`);
  }

  if (mode === 'create') {
    ['locale', 'question', 'type'].forEach((req) => {
      if (payload[req] == null) throw new Error(`"${req}" is required when creating a survey block.`);
    });
    if (payload.page_id === undefined) payload.page_id = null;
    if (payload.is_required === undefined) payload.is_required = false;
    if (payload.is_anonymous === undefined) payload.is_anonymous = false;
    if (payload.requires_rsvp === undefined) payload.requires_rsvp = false;
    if (payload.block_order === undefined) payload.block_order = 0;
    if (payload.options === undefined) payload.options = payload.type === 'text' ? [] : [];
  }

  if (Object.keys(payload).length === 0) {
    throw new Error(`No valid fields provided for ${mode}.`);
  }

  // stringify options for DB
  if (payload.options !== undefined) {
    payload.options = JSON.stringify(payload.options);
  }

  return payload;
}

// --------------------------------------------------
// Core model
// --------------------------------------------------
const SurveyBlock = {
  async getById(id, { includeDeleted = false } = {}) {
    if (!id) throw new Error('SurveyBlock ID is required.');
    const where = includeDeleted ? 'id = ?' : 'id = ? AND deleted_at IS NULL';
    const [rows] = await query(`SELECT * FROM survey_blocks WHERE ${where}`, [id]);
    return parseRow(rows[0] || null);
  },

  async getAll({ includeDeleted = false } = {}) {
    const where = includeDeleted ? '1=1' : 'deleted_at IS NULL';
    const [rows] = await query(
      `SELECT * FROM survey_blocks WHERE ${where} ORDER BY created_at DESC`,
      []
    );
    return parseRows(rows);
  },

  async getByPageId(pageId, { includeDeleted = false, locale } = {}) {
    if (!pageId) throw new Error('pageId is required.');
    const params = [pageId];
    let where = 'page_id = ?';
    if (!includeDeleted) where += ' AND deleted_at IS NULL';
    if (locale) {
      FIELD_DEFS.locale.validate(locale);
      where += ' AND locale = ?';
      params.push(locale);
    }
    const [rows] = await query(
      `SELECT * FROM survey_blocks WHERE ${where} ORDER BY block_order`,
      params
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
      `INSERT INTO survey_blocks (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    );
    return this.getById(res.insertId);
  },

  async update(id, updates = {}) {
    if (!id) throw new Error('SurveyBlock ID is required to update.');
    const payload = buildPayload('update', updates);
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.deleted_at;

    const assignments = Object.keys(payload)
      .map((k) => `${k} = ?`)
      .join(', ');
    const values = [...Object.values(payload), id];

    const [res] = await query(
      `UPDATE survey_blocks SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    if (res.affectedRows === 0) {
      throw new Error(`No survey block found with id ${id}.`);
    }
    return this.getById(id);
  },

  async softDelete(id) {
    if (!id) throw new Error('SurveyBlock ID is required to delete.');
    const [res] = await query(
      'UPDATE survey_blocks SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    return res.affectedRows || 0;
  },

  async restore(id) {
    if (!id) throw new Error('SurveyBlock ID is required to restore.');
    const [res] = await query(
      'UPDATE survey_blocks SET deleted_at = NULL WHERE id = ?',
      [id]
    );
    return res.affectedRows || 0;
  },

  async destroy(id) {
    const [res] = await query('DELETE FROM survey_blocks WHERE id = ?', [id]);
    return res.affectedRows || 0;
  },
};

module.exports = {
  getById: SurveyBlock.getById.bind(SurveyBlock),
  getAll: SurveyBlock.getAll.bind(SurveyBlock),
  getByPageId: SurveyBlock.getByPageId.bind(SurveyBlock),
  create: SurveyBlock.create.bind(SurveyBlock),
  update: SurveyBlock.update.bind(SurveyBlock),
  softDelete: SurveyBlock.softDelete.bind(SurveyBlock),
  restore: SurveyBlock.restore.bind(SurveyBlock),
  destroy: SurveyBlock.destroy.bind(SurveyBlock),
  _SurveyBlock: SurveyBlock,
};