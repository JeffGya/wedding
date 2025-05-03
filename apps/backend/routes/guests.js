const express = require('express');
const getDbConnection = require('../db/connection');
const db = getDbConnection();
const requireAuth = require('../middleware/auth');

const router = express.Router();

// Middleware: Protect all guest routes
router.use(requireAuth);

// GET /api/guests - List all guests with filtering and sorting
router.get('/', (req, res) => {
  const { attending, group_id, rsvp_response, sort_by } = req.query;

  let query = `
    SELECT id, name, attending, plus_one_name, dietary, notes, rsvp_deadline, updated_at, group_id, group_label, email, code, can_bring_plus_one, num_kids, meal_preference
    FROM guests
  `;

  const queryParams = [];
  let whereClauses = [];

  // Filter by attending status
  if (attending !== undefined) {
    whereClauses.push(`attending = ?`);
    queryParams.push(attending === 'true' ? 1 : 0);
  }

  // Filter by group_id if provided
  if (group_id !== undefined) {
    whereClauses.push(`group_id = ?`);
    queryParams.push(group_id);
  }

  // Filter by RSVP response (whether the guest has responded)
  if (rsvp_response !== undefined) {
    whereClauses.push(`attending IS NOT NULL`);
  }

  // Construct WHERE clause if any filters applied
  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
  }

  // Sorting
  if (sort_by === 'name') {
    query += ` ORDER BY name ASC`;
  } else if (sort_by === 'updated_at') {
    query += ` ORDER BY updated_at DESC`;
  } else {
    query += ` ORDER BY group_id ASC, id ASC`;
  }

  db.all(query, queryParams, (err, rows) => {
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



// RSVP: Create or update RSVP for a guest
// POST /api/guests/rsvp
router.post('/rsvp', (req, res) => {
  const { id, attending, dietary, notes, num_kids, plus_one_name, meal_preference, rsvp_deadline } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing required field: id' });
  }
  
  // Normalize attending to null if not provided
  const attendingValue = typeof attending !== 'undefined' ? attending : null;

  // Check if guest exists
  db.get('SELECT * FROM guests WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Guest not found' });

    // Update RSVP info
    const stmt = db.prepare(`
      UPDATE guests SET
        attending = ?,
        dietary = ?,
        notes = ?,
        num_kids = ?,
        plus_one_name = ?,
        meal_preference = ?,
        rsvp_deadline = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      attendingValue,
      dietary || null,
      notes || null,
      typeof num_kids !== 'undefined' ? num_kids : row.num_kids,
      plus_one_name !== undefined ? plus_one_name : row.plus_one_name,
      meal_preference !== undefined ? meal_preference : row.meal_preference,
      rsvp_deadline !== undefined ? rsvp_deadline : row.rsvp_deadline,
      id,
      function (updateErr) {
        if (updateErr) return res.status(500).json({ error: 'Failed to update RSVP' });
        res.json({ success: true });
      }
    );
  });
});

// RSVP: Update RSVP for a specific guest by id
// PUT /api/guests/:id/rsvp
router.put('/:id/rsvp', (req, res) => {
  const { id } = req.params;
  const { attending, dietary, notes, num_kids, plus_one_name } = req.body;

  // Normalize attending to null if not provided
  const attendingValue = typeof attending !== 'undefined' ? attending : null;

  // Check if guest exists
  db.get('SELECT * FROM guests WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Guest not found' });
    // Update RSVP info
    const stmt = db.prepare(`
      UPDATE guests SET
        attending = ?,
        dietary = ?,
        notes = ?,
        num_kids = ?,
        plus_one_name = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      attendingValue,
      dietary || null,
      notes || null,
      typeof num_kids !== 'undefined' ? num_kids : row.num_kids,
      plus_one_name !== undefined ? plus_one_name : row.plus_one_name,
      id,
      function (updateErr) {
        if (updateErr) return res.status(500).json({ error: 'Failed to update RSVP' });
        res.json({ success: true });
      }
    );
  });
});

module.exports = router;