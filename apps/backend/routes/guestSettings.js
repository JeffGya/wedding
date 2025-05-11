const express = require('express');
const router = express.Router();
const getDbConnection = require('../db/connection');
const db = getDbConnection();

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
router.get('/', (req, res) => {
  db.get(
    'SELECT rsvp_open, rsvp_deadline FROM guest_settings LIMIT 1',
    [],
    (err, row) => {
      if (err) {
        console.error('Error fetching guest settings:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      if (!row) {
        // No settings row yet, return defaults
        return res.json({ rsvp_open: false, rsvp_deadline: null });
      }
      res.json({
        rsvp_open: !!row.rsvp_open,
        rsvp_deadline: row.rsvp_deadline
      });
    }
  );
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
router.post('/', (req, res) => {
  const { rsvp_open, rsvp_deadline } = req.body;
  // Upsert into guest_settings
  db.get('SELECT id FROM guest_settings LIMIT 1', [], (err, row) => {
    if (err) {
      console.error('Error finding guest_settings row:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    const params = [rsvp_open ? 1 : 0, rsvp_deadline];
    if (row) {
      // Update existing row
      params.push(row.id);
      db.run(
        'UPDATE guest_settings SET rsvp_open = ?, rsvp_deadline = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        params,
        function (updateErr) {
          if (updateErr) {
            console.error('Error updating guest_settings:', updateErr);
            return res.status(500).json({ error: 'Internal server error' });
          }
          // Bulk update guest deadlines
          db.run(
            'UPDATE guests SET rsvp_deadline = ?',
            [rsvp_deadline],
            function (guestErr) {
              if (guestErr) {
                console.error('Error updating guest deadlines:', guestErr);
                return res.status(500).json({ error: 'Internal server error' });
              }
              res.json({ rsvp_open, rsvp_deadline });
            }
          );
        }
      );
    } else {
      // Insert new row
      db.run(
        'INSERT INTO guest_settings (rsvp_open, rsvp_deadline) VALUES (?, ?)',
        params,
        function (insertErr) {
          if (insertErr) {
            console.error('Error inserting guest_settings:', insertErr);
            return res.status(500).json({ error: 'Internal server error' });
          }
          // Bulk update guest deadlines
          db.run(
            'UPDATE guests SET rsvp_deadline = ?',
            [rsvp_deadline],
            function (guestErr) {
              if (guestErr) {
                console.error('Error updating guest deadlines:', guestErr);
                return res.status(500).json({ error: 'Internal server error' });
              }
              res.json({ rsvp_open, rsvp_deadline });
            }
          );
        }
      );
    }
  });
});

module.exports = router;
