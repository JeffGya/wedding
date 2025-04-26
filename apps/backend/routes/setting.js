const express = require('express');
const router = express.Router();
const getDbConnection = require('../db/connection');
const db = getDbConnection();
const requireAuth = require('../middleware/auth');

// GET email settings
router.get('/email', requireAuth, (req, res) => {
  db.get('SELECT * FROM email_settings WHERE id = 1', (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to fetch email settings' });
    }
    res.json(row);
  });
});

// UPDATE email settings
router.put('/email', requireAuth, (req, res) => {
  const { provider, api_key, from_name, from_email, sender_name, sender_email, enabled } = req.body;
  const sql = `
    UPDATE email_settings
    SET provider = ?, api_key = ?, from_name = ?, from_email = ?, sender_name = ?, sender_email = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `;
  const values = [provider, api_key, from_name, from_email, sender_name, sender_email, enabled ? 1 : 0];
  db.run(sql, values, function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update email settings' });
    }
    res.json({ success: true });
  });
});

module.exports = router;
