// apps/backend/db/models/pages.js

const getDb = require('../connection');

/**
 * Page model - handles basic CRUD operations for 'pages' table
 * (Explicitly retrieves the database instance via getDb)
 */
const Page = {
  /**
   * Create a new page
   * @param {Object} pageData - Must include slug; other fields are optional
   */
  async create(pageData) {
    const db = getDb();

    if (!pageData || typeof pageData !== 'object') {
      throw new Error('Invalid page data payload.');
    }

    if (!pageData.slug || typeof pageData.slug !== 'string') {
      throw new Error('A valid "slug" is required to create a page.');
    }

    const keys = Object.keys(pageData);
    const values = Object.values(pageData);

    if (keys.length === 0) {
      throw new Error('No data provided to create the page.');
    }

    const placeholders = keys.map(() => '?').join(', ');

    try {
      const [result] = await db.query(
        `INSERT INTO pages (${keys.join(', ')}) VALUES (${placeholders})`,
        values
      );
      return Page.findById(result.insertId);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new Error(`A page with slug "${pageData.slug}" already exists.`);
      }
      throw new Error('Database error while creating page: ' + err.message);
    }
  },

  /**
   * Get a single page by its ID
   */
  async findById(id) {
    const db = getDb();
    try {
      const [rows] = await db.query('SELECT * FROM pages WHERE id = ?', [id]);
      return rows[0];
    } catch (err) {
      throw new Error(`Database error while fetching page by ID (${id}): ${err.message}`);
    }
  },

  /**
   * Get a page by its slug (used for public rendering)
   */
  async findBySlug(slug) {
    const db = getDb();
    try {
      const [rows] = await db.query('SELECT * FROM pages WHERE slug = ?', [slug]);
      return rows[0];
    } catch (err) {
      throw new Error(`Database error while fetching page by slug ("${slug}"): ${err.message}`);
    }
  },

  /**
   * Get all pages
   * Optional: filter for published ones or include trashed later if needed
   */
  async findAll() {
    const db = getDb();
    try {
      const [rows] = await db.query('SELECT * FROM pages ORDER BY created_at DESC');
      return rows;
    } catch (err) {
      throw new Error('Database error while fetching all pages: ' + err.message);
    }
  },

  /**
   * Get all pages (ordered by creation date)
   */
  async getAll() {
    const db = getDb();
    try {
      const [rows] = await db.query('SELECT * FROM pages ORDER BY created_at DESC');
      return rows;
    } catch (err) {
      throw new Error('Database error while fetching all pages: ' + err.message);
    }
  },

  /**
   * Update a page with new values
   * @param {Number} id - ID of the page to update
   * @param {Object} updates - Fields to update
   */
  async update(id, updates) {
    if (!id) {
      throw new Error('Page ID is required for update.');
    }
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      throw new Error('A valid updates object with at least one field is required.');
    }
    const db = getDb();
    const keys = Object.keys(updates).filter(k => k !== 'translations');
    const values = keys.map(k => updates[k]);
    const assignments = keys.map(k => `${k} = ?`).join(', ');
    values.push(id);
    try {
      await db.query(
        `UPDATE pages SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );
      return Page.findById(id);
    } catch (err) {
      throw new Error(`Database error while updating page (ID: ${id}): ${err.message}`);
    }
  },

  /**
   * Delete a page (hard delete)
   * You could change this to a soft delete in the future if needed
   */
  async delete(id) {
    const db = getDb();
    try {
      await db.query('DELETE FROM pages WHERE id = ?', [id]);
    } catch (err) {
      throw new Error(`Database error while deleting page (ID: ${id}): ${err.message}`);
    }
  },

  /**
   * Remove a page by ID (hard delete)
   * @param {Number} id - ID of the page to delete
   */
  async remove(id) {
    const db = getDb();
    try {
      const [result] = await db.query('DELETE FROM pages WHERE id = ?', [id]);
      return result;
    } catch (err) {
      throw new Error(`Database error while removing page (ID: ${id}): ${err.message}`);
    }
  }
};

module.exports = {
  getAll: Page.getAll.bind(Page),
  getById: Page.findById,
  create: Page.create,
  update: Page.update,
  remove: Page.remove,
};