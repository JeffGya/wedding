const express = require('express');
const getDbConnection = require('../db/connection');
const db = getDbConnection();
let dbGet, dbRun;
if (process.env.DB_TYPE === 'mysql') {
  dbGet = async (sql, params) => {
    const [rows] = await db.query(sql, params);
    return rows[0];
  };
  dbRun = async (sql, params) => {
    const [result] = await db.query(sql, params);
    return result;
  };
} else {
  const sqlite3 = require('sqlite3').verbose();
  const util = require('util');
  dbGet = util.promisify(db.get.bind(db));
  dbRun = util.promisify(db.run.bind(db));
}
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
router.get('/', requireAuth, async (req, res) => {
  try {
    const row = await dbGet('SELECT * FROM email_settings WHERE id = ?', [1]);
    res.json(row);
  } catch (err) {
    console.error('Error retrieving email settings:', err);
    return res.status(500).json({ error: 'Failed to retrieve email settings' });
  }
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
router.post('/', requireAuth, async (req, res) => {
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

  try {
    const result = await dbRun(query, values);
    res.json({ success: true, updated: result.affectedRows || result.changes || 0 });
  } catch (err) {
    console.error('Error updating email settings:', err);
    return res.status(500).json({ error: 'Failed to update email settings' });
  }
});

module.exports = router;
