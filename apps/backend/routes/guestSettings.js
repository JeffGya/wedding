const express = require('express');
const router = express.Router();
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

/**
 * @openapi
 * /settings/guests:
 *   get:
 *     summary: Retrieve guest RSVP settings
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: Current RSVP settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rsvp_open:
 *                   type: boolean
 *                 rsvp_deadline:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *       '500':
 *         description: Internal server error
 */
// GET /api/settings/guests
router.get('/', async (req, res) => {
  try {
    const row = await dbGet('SELECT rsvp_open, rsvp_deadline FROM guest_settings LIMIT 1', []);
    if (!row) {
      return res.json({ rsvp_open: false, rsvp_deadline: null });
    }
    res.json({
      rsvp_open: !!row.rsvp_open,
      rsvp_deadline: row.rsvp_deadline
    });
  } catch (err) {
    console.error('Error fetching guest settings:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @openapi
 * /settings/guests:
 *   post:
 *     summary: Create or update guest RSVP settings
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rsvp_open:
 *                 type: boolean
 *               rsvp_deadline:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       '200':
 *         description: RSVP settings updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rsvp_open:
 *                   type: boolean
 *                 rsvp_deadline:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *       '500':
 *         description: Internal server error
 */
// POST /api/settings/guests
router.post('/', async (req, res) => {
  const { rsvp_open, rsvp_deadline } = req.body;
  try {
    const existing = await dbGet('SELECT id FROM guest_settings LIMIT 1', []);
    const params = [rsvp_open ? 1 : 0, rsvp_deadline];
    if (existing) {
      // Update existing row
      params.push(existing.id);
      await dbRun(
        'UPDATE guest_settings SET rsvp_open = ?, rsvp_deadline = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        params
      );
    } else {
      // Insert new row
      await dbRun(
        'INSERT INTO guest_settings (rsvp_open, rsvp_deadline) VALUES (?, ?)',
        params
      );
    }
    // Bulk update guest deadlines
    await dbRun('UPDATE guests SET rsvp_deadline = ?', [rsvp_deadline]);
    return res.json({ rsvp_open, rsvp_deadline });
  } catch (err) {
    console.error('Error saving guest settings or updating deadlines:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
