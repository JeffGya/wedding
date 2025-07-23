// apps/backend/db/models/pageTranslation.js
// Soft-delete aware model for `page_translations` with:
// - schema-based validation (incl. block-level validation for `content`)
// - driver-agnostic queries
// - loud errors on unknown fields
// - helper methods: softDelete, restore, destroy, includeDeleted filters

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
const LOCALE_REGEX = /^[a-z]{2}(-[A-Z]{2})?$/; // en, lt, en-US

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function parseContentJSON(row) {
  if (!row) return row;
  if (typeof row.content === 'string') {
    try {
      row.content = JSON.parse(row.content);
    } catch {
      // leave as string if malformed
    }
  }
  return row;
}

function parseRows(rows) {
  return rows.map(parseContentJSON);
}

// --------------------------------------------------
// Block validation
// --------------------------------------------------
const BLOCK_TYPES = new Set(['rich-text', 'image', 'video', 'divider', 'map', 'survey']);

function validateBlocks(blocks) {
  if (!Array.isArray(blocks)) {
    throw new Error('`content` must be an array of blocks.');
  }

  return blocks.map((block, idx) => {
    if (!isPlainObject(block)) {
      throw new Error(`Block at index ${idx} must be an object.`);
    }
    const { type } = block;
    if (!type || !BLOCK_TYPES.has(type)) {
      throw new Error(`Block at index ${idx} has invalid or missing "type".`);
    }

    switch (type) {
      case 'rich-text':
        if (typeof block.html !== 'string') {
          throw new Error(`rich-text block at index ${idx} requires "html" string.`);
        }
        break;
      case 'image':
        if (typeof block.src !== 'string') {
          throw new Error(`image block at index ${idx} requires "src" string.`);
        }
        break;
      case 'video':
        if (typeof block.embed !== 'string') {
          throw new Error(`video block at index ${idx} requires "embed" string.`);
        }
        break;
      case 'divider':
        // no fields
        break;
      case 'map':
        if (typeof block.embed !== 'string') {
          throw new Error(`map block at index ${idx} requires "embed" string.`);
        }
        break;
      case 'survey':
        if (!Number.isInteger(block.id)) {
          throw new Error(`survey block at index ${idx} requires numeric "id".`);
        }
        break;
    }

    return block;
  });
}

// --------------------------------------------------
// Field schema + validators
// --------------------------------------------------
const FIELD_DEFS = {
  page_id: {
    modes: ['create', 'update'],
    validate(v) {
      if (!Number.isInteger(v) || v <= 0) {
        throw new Error('Field "page_id" must be a positive integer.');
      }
      return v;
    },
  },
  locale: {
    modes: ['create', 'update'],
    validate(v) {
      if (typeof v !== 'string' || !LOCALE_REGEX.test(v)) {
        throw new Error('Field "locale" must be a valid locale code (e.g., "en", "lt").');
      }
      return v;
    },
  },
  title: {
    modes: ['create', 'update'],
    validate(v) {
      if (v != null && typeof v !== 'string') {
        throw new Error('Field "title" must be a string if provided.');
      }
      return v;
    },
  },
  content: {
    modes: ['create', 'update'],
    validate(v) {
      if (v == null) return v;
      // Accept array or object (legacy). Prefer array.
      if (Array.isArray(v)) {
        return validateBlocks(v);
      }
      if (isPlainObject(v)) return v; // allow old shape, validation done elsewhere
      throw new Error('Field "content" must be an object or array of blocks.');
    },
  },
  created_at: { modes: [], validate: v => v },
  updated_at: { modes: [], validate: v => v },
  deleted_at: { modes: [], validate: v => v },
};

function buildPayload(mode, input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Payload must be an object.');
  }

  const allowedKeys = Object.entries(FIELD_DEFS)
    .filter(([, def]) => def.modes.includes(mode))
    .map(([k]) => k);

  const payload = {};
  const unknown = [];
  for (const [key, val] of Object.entries(input)) {
    if (!allowedKeys.includes(key)) {
      unknown.push(key);
      continue;
    }
    payload[key] = FIELD_DEFS[key].validate(val);
  }

  if (unknown.length) {
    throw new Error(`Unknown/unsupported field(s) for ${mode}: ${unknown.join(', ')}`);
  }

  if (mode === 'create') {
    if (payload.page_id == null) throw new Error('"page_id" is required when creating a translation.');
    if (payload.locale == null) throw new Error('"locale" is required when creating a translation.');
  }

  if (Object.keys(payload).length === 0) {
    throw new Error(`No valid fields provided for ${mode}.`);
  }

  // Always stringify content for DB
  if (payload.content !== undefined) {
    payload.content = JSON.stringify(payload.content);
  }

  return payload;
}

// --------------------------------------------------
// Core model
// --------------------------------------------------
const PageTranslation = {
  async getById(id, { includeDeleted = false } = {}) {
    if (!id) throw new Error('Translation ID is required.');
    const where = includeDeleted ? 'id = ?' : 'id = ? AND deleted_at IS NULL';
    const [rows] = await query(`SELECT * FROM page_translations WHERE ${where}`, [id]);
    return parseContentJSON(rows[0] || null);
  },

  async getTranslationsByPageId(pageId, { includeDeleted = false } = {}) {
    if (!pageId) throw new Error('pageId is required.');
    const where = includeDeleted ? 'page_id = ?' : 'page_id = ? AND deleted_at IS NULL';
    const [rows] = await query(`SELECT * FROM page_translations WHERE ${where}`, [pageId]);
    return parseRows(rows);
  },

  async getTranslationByPageIdAndLang(pageId, locale, { includeDeleted = false } = {}) {
    if (!pageId) throw new Error('pageId is required.');
    FIELD_DEFS.locale.validate(locale);
    const where = includeDeleted
      ? 'page_id = ? AND locale = ?'
      : 'page_id = ? AND locale = ? AND deleted_at IS NULL';

    const [rows] = await query(
      `SELECT * FROM page_translations WHERE ${where} LIMIT 1`,
      [pageId, locale]
    );
    return parseContentJSON(rows[0] || null);
  },

  async create(data = {}) {
    const payload = buildPayload('create', data);
    const now = new Date();

    const keys = Object.keys(payload).concat(['created_at', 'updated_at']);
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(payload).concat([now, now]);

    const [result] = await query(
      `INSERT INTO page_translations (${keys.join(', ')}) VALUES (${placeholders})`,
      values
    );

    return this.getById(result.insertId);
  },

  async createTranslation(data) {
    const created = await this.create(data);
    return created.id;
  },

  async update(id, updates = {}) {
    if (!id) throw new Error('Translation ID is required to update.');

    const payload = buildPayload('update', updates);
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.deleted_at;

    const assignments = Object.keys(payload)
      .map((k) => `${k} = ?`)
      .join(', ');
    const values = [...Object.values(payload), id];

    const [result] = await query(
      `UPDATE page_translations SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      throw new Error(`No translation found with id ${id}.`);
    }

    return this.getById(id);
  },

  async updateTranslation(id, updates) {
    const before = await this.getById(id);
    if (!before) return 0;
    await this.update(id, updates);
    return 1;
  },

  async upsertTranslation({ page_id, locale, title, content }) {
    const existing = await this.getTranslationByPageIdAndLang(page_id, locale);
    if (existing) {
      await this.update(existing.id, { title, content });
      return existing.id;
    }
    return this.createTranslation({ page_id, locale, title, content });
  },

  // Soft delete
  async softDelete(id) {
    if (!id) throw new Error('Translation ID is required to delete.');
    const [res] = await query(
      'UPDATE page_translations SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    return res.affectedRows || 0;
  },

  async restore(id) {
    if (!id) throw new Error('Translation ID is required to restore.');
    const [res] = await query(
      'UPDATE page_translations SET deleted_at = NULL WHERE id = ?',
      [id]
    );
    return res.affectedRows || 0;
  },

  // Hard delete
  async destroy(id) {
    const [result] = await query('DELETE FROM page_translations WHERE id = ?', [id]);
    return result.affectedRows || 0;
  },

  async deleteTranslation(id) {
    // kept for backward compatibility but uses hard delete
    return this.destroy(id);
  },

  async deleteAllByPageId(pageId) {
    const [result] = await query('DELETE FROM page_translations WHERE page_id = ?', [pageId]);
    return result.affectedRows || 0;
  },
};

// --------------------------------------------------
// Exports (keep old names for compatibility)
// --------------------------------------------------
module.exports = {
  // core
  getById: PageTranslation.getById.bind(PageTranslation),
  create: PageTranslation.create.bind(PageTranslation),
  update: PageTranslation.update.bind(PageTranslation),

  // filters
  getTranslationsByPageId: PageTranslation.getTranslationsByPageId.bind(PageTranslation),
  getTranslationByPageIdAndLang: PageTranslation.getTranslationByPageIdAndLang.bind(PageTranslation),
  getByPageIdAndLocale: PageTranslation.getTranslationByPageIdAndLang.bind(PageTranslation),

  // upsert & legacy
  createTranslation: PageTranslation.createTranslation.bind(PageTranslation),
  updateTranslation: PageTranslation.updateTranslation.bind(PageTranslation),
  upsertTranslation: PageTranslation.upsertTranslation.bind(PageTranslation),

  // delete helpers
  deleteTranslation: PageTranslation.deleteTranslation.bind(PageTranslation),
  deleteAllByPageId: PageTranslation.deleteAllByPageId.bind(PageTranslation),
  softDelete: PageTranslation.softDelete.bind(PageTranslation),
  restore: PageTranslation.restore.bind(PageTranslation),
  destroy: PageTranslation.destroy.bind(PageTranslation),

  _PageTranslation: PageTranslation,
};