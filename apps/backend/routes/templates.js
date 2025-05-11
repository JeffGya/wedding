const express = require('express');
const router = express.Router();
const getDbConnection = require('../db/connection');
const db = getDbConnection();
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
router.get('/', (req, res) => {
  const sql = `SELECT * FROM templates ORDER BY created_at DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, templates: rows });
  });
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
router.get('/:id', (req, res) => {
  const sql = `SELECT * FROM templates WHERE id = ?`;
  db.get(sql, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!row) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, template: row });
  });
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
router.post('/', (req, res) => {
  const { name, subject, body_en, body_lt } = req.body;

  if (!name || !subject || !body_en || !body_lt) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  const sql = `
    INSERT INTO templates (name, subject, body_en, body_lt)
    VALUES (?, ?, ?, ?)
  `;
  db.run(sql, [name, subject, body_en, body_lt], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, id: this.lastID });
  });
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
router.put('/:id', (req, res) => {
  const { name, subject, body_en, body_lt } = req.body;

  if (!name || !subject || !body_en || !body_lt) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  const sql = `
    UPDATE templates 
    SET name = ?, subject = ?, body_en = ?, body_lt = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `;
  db.run(sql, [name, subject, body_en, body_lt, req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (this.changes === 0) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true });
  });
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
router.delete('/:id', (req, res) => {
  const sql = `DELETE FROM templates WHERE id = ?`;
  db.run(sql, [req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
