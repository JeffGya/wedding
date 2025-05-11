const express = require('express');
const getDbConnection = require('../db/connection');
const db = getDbConnection();
const requireAuth = require('../middleware/auth');

const router = express.Router();

/**
 * @openapi
 * /emailSettings:
 *   get:
 *     summary: Retrieve the current email settings
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: The email settings object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailSettings'
 *       '500':
 *         description: Server error retrieving settings
 */
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

/**
 * @openapi
 * /emailSettings:
 *   post:
 *     summary: Update email settings
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailSettingsUpdate'
 *     responses:
 *       '200':
 *         description: Result of the update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 updated:
 *                   type: integer
 *       '500':
 *         description: Server error updating settings
 */
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
