// apps/backend/db/models/pages.js
// Driver-agnostic Page model with explicit field schema validation + loud debugging.

'use strict';

const getDb = require('../connection');

// ---------------------------------------------
// Query wrapper to normalize mysql2 & sqlite3
// ---------------------------------------------
async function query(sql, params = []) {
  const db = getDb();

  // mysql2/promise style
  if (typeof db.query === 'function') {
    return db.query(sql, params);
  }

  // sqlite3 verbose style
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

// ---------------------------------------------
// Field schema + validators
// ---------------------------------------------
const SLUG_REGEX = /^[a-z0-9-]+$/i;

const FIELD_DEFS = {
  slug: {
    modes: ['create', 'update'],
    validate(v) {
      if (typeof v !== 'string' || !SLUG_REGEX.test(v)) {
        throw new Error('Field "slug" must contain only letters, numbers, or hyphens.');
      }
      return v;
    },
  },
  is_published: {
    modes: ['create', 'update'],
    validate(v) {
      if (typeof v !== 'boolean') throw new Error('Field "is_published" must be boolean.');
      return v;
    },
  },
  requires_rsvp: {
    modes: ['create', 'update'],
    validate(v) {
      if (typeof v !== 'boolean') throw new Error('Field "requires_rsvp" must be boolean.');
      return v;
    },
  },
  show_in_nav: {
    modes: ['create', 'update'],
    validate(v) {
      if (typeof v !== 'boolean') throw new Error('Field "show_in_nav" must be boolean.');
      return v;
    },
  },
  nav_order: {
    modes: ['create', 'update'],
    validate(v) {
      if (!Number.isInteger(v) || v < 0) {
        throw new Error('Field "nav_order" must be a non-negative integer.');
      }
      return v;
    },
  },
  header_image_url: {
    modes: ['create', 'update'],
    validate(v) {
      if (v === null || v === undefined) return null;
      if (typeof v !== 'string') {
        throw new Error('Field "header_image_url" must be a string or null.');
      }
      if (v.length > 500) {
        throw new Error('Field "header_image_url" must be 500 characters or less.');
      }
      
      // Validate URL format
      try {
        new URL(v);
      } catch {
        throw new Error('Field "header_image_url" must be a valid URL.');
      }
      
      return v;
    },
  },
  created_at: { modes: [], validate: v => v }, // DB managed
  updated_at: { modes: [], validate: v => v }, // DB managed
};

/**
 * Build and validate payload for create/update.
 * @param {'create'|'update'} mode
 * @param {Object} input
 */
function buildPayload(mode, input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Payload must be an object.');
  }

  const allowedForMode = Object.entries(FIELD_DEFS)
    .filter(([, def]) => def.modes.includes(mode))
    .map(([k]) => k);

  const payload = {};
  const unknownKeys = [];
  for (const [key, value] of Object.entries(input)) {
    if (!allowedForMode.includes(key)) {
      unknownKeys.push(key);
      continue;
    }
    payload[key] = FIELD_DEFS[key].validate(value);
  }

  if (unknownKeys.length) {
    // Fail loud; debugging made easy
    throw new Error(
      `Unknown/unsupported field(s) for ${mode}: ${unknownKeys.join(', ')}`
    );
  }

  if (mode === 'create' && payload.slug == null) {
    throw new Error('"slug" is required when creating a page.');
  }

  if (Object.keys(payload).length === 0) {
    throw new Error(`No valid fields provided for ${mode}.`);
  }

  return payload;
}

// ---------------------------------------------
// Core model
// ---------------------------------------------
const Page = {
  async create(data = {}) {
    const payload = buildPayload('create', data);

    // Prevent duplicate nav_order when showing in nav
    if (payload.show_in_nav && payload.nav_order != null) {
      const checkSql = 'SELECT COUNT(*) AS count FROM pages WHERE show_in_nav = TRUE AND nav_order = ?';
      const [[{ count }]] = await query(checkSql, [payload.nav_order]);
      if (count > 0) {
        throw new Error(`Navigation order ${payload.nav_order} is already in use.`);
      }
    }

    const keys = Object.keys(payload);
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(payload);

    try {
      const [result] = await query(
        `INSERT INTO pages (${keys.join(', ')}) VALUES (${placeholders})`,
        values
      );
      return this.findById(result.insertId);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT') {
        throw new Error(`A page with slug "${payload.slug}" already exists.`);
      }
      throw new Error('Database error while creating page: ' + err.message);
    }
  },

  async findById(id, { includeDeleted = false } = {}) {
    if (!id) throw new Error('Page ID is required.');

    const where = includeDeleted ? 'id = ?' : 'id = ? AND deleted_at IS NULL';
    try {
      const [rows] = await query(`SELECT * FROM pages WHERE ${where}`, [id]);
      return rows[0] || null;
    } catch (err) {
      throw new Error(
        `Database error while fetching page by ID (${id}): ${err.message}`
      );
    }
  },

  async findBySlug(slug, { includeDeleted = false } = {}) {
    FIELD_DEFS.slug.validate(slug);
    const where = includeDeleted ? 'slug = ?' : 'slug = ? AND deleted_at IS NULL';
    try {
      const [rows] = await query(`SELECT * FROM pages WHERE ${where}`, [slug]);
      return rows[0] || null;
    } catch (err) {
      throw new Error(
        `Database error while fetching page by slug ("${slug}"): ${err.message}`
      );
    }
  },

  async getAll({ includeDeleted = false } = {}) {
    const where = includeDeleted ? '' : 'WHERE deleted_at IS NULL';
    try {
      const [rows] = await query(
        `SELECT * FROM pages ${where} ORDER BY created_at DESC`
      );
      return rows;
    } catch (err) {
      throw new Error('Database error while fetching all pages: ' + err.message);
    }
  },

  async update(id, updates = {}) {
    if (!id) throw new Error('Page ID is required for update.');

    const payload = buildPayload('update', updates);

    // Prevent duplicate nav_order when showing in nav
    if (payload.show_in_nav === true || payload.nav_order != null) {
      const newShow = payload.show_in_nav === true;
      const newOrder = payload.nav_order != null ? payload.nav_order : null;
      if (newShow && newOrder != null) {
        const checkSql = 'SELECT COUNT(*) AS count FROM pages WHERE show_in_nav = TRUE AND nav_order = ? AND id != ?';
        const [[{ count }]] = await query(checkSql, [newOrder, id]);
        if (count > 0) {
          throw new Error(`Navigation order ${newOrder} is already in use.`);
        }
      }
    }

    // never allow manual timestamp manipulation
    delete payload.created_at;
    delete payload.updated_at;

    const assignments = Object.keys(payload)
      .map((k) => `${k} = ?`)
      .join(', ');

    const values = [...Object.values(payload), id];

    try {
      await query(
        `UPDATE pages SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );
      return this.findById(id);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY' || err.code === 'SQLITE_CONSTRAINT') {
        throw new Error(`A page with slug "${updates.slug}" already exists.`);
      }
      throw new Error(
        `Database error while updating page (ID: ${id}): ${err.message}`
      );
    }
  },

  // Soft delete (sets deleted_at). Hard delete kept as destroy()
  async softDelete(id) {
    if (!id) throw new Error('Page ID is required to delete.');
    try {
      await query('UPDATE pages SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
      return { success: true };
    } catch (err) {
      throw new Error(
        `Database error while soft-deleting page (ID: ${id}): ${err.message}`
      );
    }
  },

  async restore(id) {
    if (!id) throw new Error('Page ID is required to restore.');
    try {
      await query('UPDATE pages SET deleted_at = NULL WHERE id = ?', [id]);
      return this.findById(id);
    } catch (err) {
      throw new Error(
        `Database error while restoring page (ID: ${id}): ${err.message}`
      );
    }
  },

  async destroy(id) {
    if (!id) throw new Error('Page ID is required to hard delete.');
    try {
      const [result] = await query('DELETE FROM pages WHERE id = ?', [id]);
      return result;
    } catch (err) {
      throw new Error(
        `Database error while hard-deleting page (ID: ${id}): ${err.message}`
      );
    }
  },

  /**
   * Flexible findAll for compatibility with "where" and "order" like Sequelize.
   * Only supports basic { is_published: true, show_in_nav: true } and order by nav_order.
   */
  async findAll({ where = {}, order = [] } = {}) {
    // Build WHERE clause
    const wheres = [];
    const params = [];
    Object.entries(where).forEach(([k, v]) => {
      wheres.push(`${k} = ?`);
      params.push(v);
    });
    const whereSql = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';

    // Only support order: [['nav_order', 'ASC']]
    let orderSql = '';
    if (Array.isArray(order) && order.length && Array.isArray(order[0])) {
      const [col, dir] = order[0];
      orderSql = `ORDER BY ${col} ${dir}`;
    }

    const sql = `SELECT * FROM pages ${whereSql} ${orderSql}`;
    const [rows] = await query(sql, params);
    return rows;
  },
};

module.exports = {
  getAll: Page.getAll.bind(Page),
  getById: Page.findById.bind(Page),
  getBySlug: Page.findBySlug.bind(Page),
  create: Page.create.bind(Page),
  update: Page.update.bind(Page),
  softDelete: Page.softDelete.bind(Page),
  restore: Page.restore.bind(Page),
  destroy: Page.destroy.bind(Page),
  findAll: Page.findAll.bind(Page),
  _Page: Page,
};