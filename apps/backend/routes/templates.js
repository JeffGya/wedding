const express = require('express');
const router = express.Router();
const getDbConnection = require('../db/connection');
const db = getDbConnection();

let dbGet, dbAll, dbRun;
if (process.env.DB_TYPE === 'mysql') {
  dbGet = async (sql, params) => {
    const [rows] = await db.query(sql, params);
    return rows[0];
  };
  dbAll = async (sql, params) => {
    const [rows] = await db.query(sql, params);
    return rows;
  };
  dbRun = async (sql, params) => {
    const [result] = await db.query(sql, params);
    return result;
  };
} else {
  const sqlite3 = require('sqlite3').verbose();
  const util = require('util');
  dbGet = util.promisify(db.get.bind(db));
  dbAll = util.promisify(db.all.bind(db));
  dbRun = util.promisify(db.run.bind(db));
}

const requireAuth = require('../middleware/auth');

// Protect all routes
router.use(requireAuth);

// Debug log for all requests to this route
router.use((req, res, next) => {
  console.log('✅ Auth passed, hitting template route:', req.method, req.originalUrl);
  next();
});

/**
 * @openapi
 * /templates:
 *   get:
 *     summary: Retrieve all message templates
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: A list of templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 templates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Template'
 *       '500':
 *         description: Database error
 */
// Get all templates
router.get('/', async (req, res) => {
  const sql = `SELECT * FROM templates ORDER BY created_at DESC`;
  try {
    const rows = await dbAll(sql, []);
    res.json({ success: true, templates: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /templates/{id}:
 *   get:
 *     summary: Retrieve a single template by ID
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: A template object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 template:
 *                   $ref: '#/components/schemas/Template'
 *       '404':
 *         description: Template not found
 *       '500':
 *         description: Database error
 */
// Get a single template
router.get('/:id', async (req, res) => {
  const sql = `SELECT * FROM templates WHERE id = ?`;
  try {
    const row = await dbGet(sql, [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, template: row });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /templates:
 *   post:
 *     summary: Create a new message template
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TemplateCreate'
 *     responses:
 *       '200':
 *         description: Template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 id:
 *                   type: integer
 *       '400':
 *         description: Validation error (missing fields)
 *       '500':
 *         description: Database error
 */
// Create a new template
router.post('/', async (req, res) => {
  const { name, subject, body_en, body_lt } = req.body;

  if (!name || !subject || !body_en || !body_lt) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  const sql = `
    INSERT INTO templates (name, subject, body_en, body_lt)
    VALUES (?, ?, ?, ?)
  `;
  try {
    const result = await dbRun(sql, [name, subject, body_en, body_lt]);
    const id = result.insertId || result.lastID;
    res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /templates/{id}:
 *   put:
 *     summary: Update an existing message template
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TemplateCreate'
 *     responses:
 *       '200':
 *         description: Template updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '400':
 *         description: Validation error (missing fields)
 *       '404':
 *         description: Template not found
 *       '500':
 *         description: Database error
 */
// Update a template
router.put('/:id', async (req, res) => {
  const { name, subject, body_en, body_lt } = req.body;

  if (!name || !subject || !body_en || !body_lt) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  const sql = `
    UPDATE templates 
    SET name = ?, subject = ?, body_en = ?, body_lt = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `;
  try {
    const result = await dbRun(sql, [name, subject, body_en, body_lt, req.params.id]);
    const changes = result.affectedRows !== undefined ? result.affectedRows : result.changes;
    if (changes === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /templates/{id}:
 *   delete:
 *     summary: Delete a message template
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Template deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '500':
 *         description: Database error
 */
// Delete a template
router.delete('/:id', async (req, res) => {
  const sql = `DELETE FROM templates WHERE id = ?`;
  try {
    await dbRun(sql, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
