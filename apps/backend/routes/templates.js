const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const requireAuth = require('../middleware/auth');

// Protect all routes
router.use(requireAuth);

// Debug log for all requests to this route
router.use((req, res, next) => {
  console.log('✅ Auth passed, hitting template route:', req.method, req.originalUrl);
  next();
});

// Get all templates
router.get('/', (req, res) => {
  const sql = `SELECT * FROM templates ORDER BY created_at DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, templates: rows });
  });
});

// Get a single template
router.get('/:id', (req, res) => {
  console.log('🧪 Hitting GET /templates/:id with', req.params.id);
  const sql = `SELECT * FROM templates WHERE id = ?`;
  db.get(sql, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!row) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, template: row });
  });
});

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

// Delete a template
router.delete('/:id', (req, res) => {
  const sql = `DELETE FROM templates WHERE id = ?`;
  db.run(sql, [req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
