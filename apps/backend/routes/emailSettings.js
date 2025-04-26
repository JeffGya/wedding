const express = require('express');
const getDbConnection = require('../db/connection');
const db = getDbConnection();
const requireAuth = require('../middleware/auth');

const router = express.Router();

// Get email settings
router.get('/', requireAuth, (req, res) => {
  const query = 'SELECT * FROM email_settings WHERE id = 1';

  db.get(query, (err, row) => {
    if (err) {
      console.error('Error retrieving email settings:', err);
      return res.status(500).json({ error: 'Failed to retrieve email settings' });
    }

    res.json(row);
  });
});

// Update email settings
router.post('/', requireAuth, (req, res) => {
  const {
    provider,
    api_key,
    from_name,
    from_email,
    sender_name,
    sender_email,
    enabled,
  } = req.body;

  const query = `
    UPDATE email_settings
    SET provider = ?, api_key = ?, from_name = ?, from_email = ?, sender_name = ?, sender_email = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `;

  const values = [
    provider,
    api_key,
    from_name,
    from_email,
    sender_name,
    sender_email,
    enabled ? 1 : 0,
  ];

  db.run(query, values, function (err) {
    if (err) {
      console.error('Error updating email settings:', err);
      return res.status(500).json({ error: 'Failed to update email settings' });
    }

    res.json({ success: true, updated: this.changes });
  });
});

module.exports = router;
