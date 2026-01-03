const express = require('express');
const logger = require('../helpers/logger');
const router = express.Router();
const getDbConnection = require('../db/connection');
const { createDbHelpers } = require('../db/queryHelpers');
const db = getDbConnection();
const { dbGet, dbRun } = createDbHelpers(db);

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
    let deadlineString = null;
    if (row.rsvp_deadline) {
      // row.rsvp_deadline may be a JS Date (MySQL) or a string (SQLite)
      const d = new Date(row.rsvp_deadline);
      // Format as "YYYY-MM-DD HH:MM:SS"
      const pad = num => String(num).padStart(2, '0');
      const year = d.getUTCFullYear();
      const month = pad(d.getUTCMonth() + 1);
      const day = pad(d.getUTCDate());
      const hours = pad(d.getUTCHours());
      const minutes = pad(d.getUTCMinutes());
      const seconds = pad(d.getUTCSeconds());
      deadlineString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
    res.json({
      rsvp_open: !!row.rsvp_open,
      rsvp_deadline: deadlineString
    });
  } catch (err) {
    logger.error('Error fetching guest settings:', err);
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
    // Clear template variables cache since guest settings changed
    const { clearSettingsCache } = require('../utils/templateVariables');
    clearSettingsCache();
    return res.json({ rsvp_open, rsvp_deadline });
  } catch (err) {
    logger.error('Error saving guest settings or updating deadlines:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
