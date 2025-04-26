const express = require('express');
const getDbConnection = require('../db/connection');
const db = getDbConnection();
const requireAuth = require('../middleware/auth');

const router = express.Router();

// Middleware: Protect all guest routes
router.use(requireAuth);

// GET /api/guests - List all guests
router.get('/', (req, res) => {
  db.all('SELECT * FROM guests ORDER BY group_id ASC, id ASC', [], (err, rows) => {
    if (err) {
      console.error('Error fetching guests:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// GET /api/guests/:id - Get one guest
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM guests WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Guest not found' });
    res.json(row);
  });
});

// POST /api/guests - Create guest
router.post('/', (req, res) => {
  const {
    group_id,
    group_label,
    name,
    email,
    code,
    can_bring_plus_one,
    num_kids
  } = req.body;

  const stmt = db.prepare(`
    INSERT INTO guests (
      group_id, group_label, name, email, code,
      can_bring_plus_one, num_kids
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    group_id,
    group_label,
    name,
    email,
    code,
    can_bring_plus_one || 0,
    num_kids || 0,
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to create guest' });
      res.status(201).json({ id: this.lastID });
    }
  );
});

// PUT /api/guests/:id - Update guest
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    group_label,
    can_bring_plus_one,
    num_kids,
    attending,
    dietary,
    notes
  } = req.body;

  const stmt = db.prepare(`
    UPDATE guests SET
      name = ?, email = ?, group_label = ?,
      can_bring_plus_one = ?, num_kids = ?, attending = ?,
      dietary = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(
    name,
    email,
    group_label,
    can_bring_plus_one || 0,
    num_kids || 0,
    attending,
    dietary,
    notes,
    id,
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to update guest' });
      res.json({ success: true });
    }
  );
});

// DELETE /api/guests/:id - Delete guest
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM guests WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete guest' });
    res.json({ success: true });
  });
});

module.exports = router;
