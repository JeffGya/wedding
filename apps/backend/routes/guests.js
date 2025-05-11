const express = require('express');
const getDbConnection = require('../db/connection');
const db = getDbConnection();
const requireAuth = require('../middleware/auth');
const axios = require('axios');
const getSenderInfo = require('../helpers/getSenderInfo');
const logger = require('../helpers/logger');

const router = express.Router();

// Middleware: Protect all guest routes
router.use(requireAuth);

async function sendConfirmationEmail(db, guestData) {
  try {
    // Fetch sender info
    const senderInfo = await getSenderInfo(db);
    // Fetch confirmation template
    db.get("SELECT * FROM templates WHERE name = ?", ["RSVP Confirmation"], (err, template) => {
      if (err || !template) {
        logger.error("Failed to load RSVP Confirmation template: %o", err);
        return;
      }
      // Determine language
      const lang = guestData.preferred_language === 'lt' ? 'lt' : 'en';
      const subject = template.subject;
      const bodyTemplate = lang === 'lt' ? template.body_lt : template.body_en;
      // Replace placeholders
      const html = bodyTemplate
        .replace(/{{\s*name\s*}}/g, guestData.name)
        .replace(/{{\s*groupLabel\s*}}/g, guestData.group_label)
        .replace(/{{\s*code\s*}}/g, guestData.code)
        .replace(/{{\s*rsvpLink\s*}}/g, `https://yourdomain.com/rsvp/${guestData.code}`);
      // Send via Resend
      axios.post("https://api.resend.com/emails", {
        from: senderInfo,
        to: guestData.email,
        subject,
        html
      }, {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
      }).then(resp => {
        logger.info("Confirmation email sent: %o", resp.data);
      }).catch(emailErr => {
        logger.error("Error sending confirmation email: %o", emailErr);
      });
    });
  } catch (e) {
    console.error("Error in sendConfirmationEmail:", e);
  }
}

/**
 * @openapi
 * /guests:
 *   get:
 *     summary: List all guests
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: attending
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: group_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: rsvp_status
 *         schema:
 *           type: string
 *           enum: [pending, attending, not_attending]
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [name, updated_at]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: per_page
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: A list of guests with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 guests:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Guest'
 *                 total:
 *                   type: integer
 */
router.get('/', (req, res) => {
  const { attending, group_id, rsvp_status, sort_by, page = 1, per_page = 40 } = req.query;

  let query = `
    SELECT
      id, group_id, group_label, name, preferred_language, email, code,
      can_bring_plus_one, is_primary, attending,
      rsvp_status, dietary, notes, rsvp_deadline, updated_at
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

  // Filter by RSVP status if provided
  if (rsvp_status !== undefined) {
    whereClauses.push(`rsvp_status = ?`);
    queryParams.push(rsvp_status);
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
    query += ` ORDER BY group_id ASC, id ASC`;  // Default sorting
  }

  // Pagination
  const limit = parseInt(per_page);
  const offset = (parseInt(page) - 1) * limit;

  query += ` LIMIT ? OFFSET ?`;
  queryParams.push(limit, offset);

  db.all(query, queryParams, (err, rows) => {
    if (err) {
      logger.error('Error fetching guests: %o', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ guests: rows, total: rows.length }); // Adjust if needed
  });
});

/**
 * @openapi
 * /guests/analytics:
 *   get:
 *     summary: Retrieve RSVP statistics by status
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: RSVP statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                 dietary:
 *                   type: object
 *                     additionalProperties:
 *                       type: integer
 *                 no_shows:
 *                   type: integer
 *                 late_responses:
 *                   type: integer
 *                 avg_response_time_days:
 *                   type: number
 */
router.get('/analytics', (req, res) => {
  db.serialize(() => {
    // RSVP counts by status
    db.all(
      `SELECT rsvp_status AS status, COUNT(*) AS count
       FROM guests
       GROUP BY rsvp_status;`,
      [],
      (err, rows) => {
        if (err) {
          logger.error('Error fetching RSVP analytics:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        const stats = { total: 0, attending: 0, not_attending: 0, pending: 0 };
        rows.forEach((row) => {
          stats[row.status] = row.count;
          stats.total += row.count;
        });

        // Dietary breakdown
        db.all(
          `SELECT dietary, COUNT(*) AS count
           FROM guests
           WHERE dietary IS NOT NULL AND dietary != ''
           GROUP BY dietary;`,
          [],
          (dietErr, dietRows) => {
            if (dietErr) {
              logger.error('Error fetching dietary analytics:', dietErr);
              return res.status(500).json({ error: 'Database error' });
            }
            const dietary = {};
            dietRows.forEach((row) => {
              dietary[row.dietary] = row.count;
            });

            // No-shows (pending past deadline)
            db.get(
              `SELECT COUNT(*) AS no_shows
               FROM guests
               WHERE rsvp_status = 'pending'
                 AND rsvp_deadline IS NOT NULL
                 AND rsvp_deadline < datetime('now');`,
              [],
              (noErr, noRow) => {
                if (noErr) {
                  logger.error('Error fetching no-shows analytics:', noErr);
                  return res.status(500).json({ error: 'Database error' });
                }

                // Late responses (responded after deadline)
                db.get(
                  `SELECT COUNT(*) AS late_responses
                   FROM guests
                   WHERE rsvp_status IN ('attending','not_attending')
                     AND rsvp_deadline IS NOT NULL
                     AND updated_at > rsvp_deadline;`,
                  [],
                  (lateErr, lateRow) => {
                    if (lateErr) {
                      logger.error('Error fetching late responses analytics:', lateErr);
                      return res.status(500).json({ error: 'Database error' });
                    }

                    // Average time to RSVP (in days)
                    db.get(
                      `SELECT AVG(JULIANDAY(updated_at) - JULIANDAY(created_at)) AS avg_response_days
                       FROM guests
                       WHERE created_at IS NOT NULL
                         AND updated_at IS NOT NULL;`,
                      [],
                      (avgErr, avgRow) => {
                        if (avgErr) {
                          logger.error('Error fetching avg response time analytics:', avgErr);
                          return res.status(500).json({ error: 'Database error' });
                        }

                        res.json({
                          success: true,
                          stats,
                          dietary,
                          no_shows: noRow.no_shows || 0,
                          late_responses: lateRow.late_responses || 0,
                          avg_response_time_days: avgRow.avg_response_days || 0.0
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

/**
 * @openapi
 * /guests/{id}:
 *   get:
 *     summary: Retrieve a single guest by ID
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: A guest object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Guest'
 *       '404':
 *         description: Guest not found
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM guests WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Guest not found' });
    res.json(row);
  });
});

/**
 * @openapi
 * /guests:
 *   post:
 *     summary: Create a new guest
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GuestCreate'
 *     responses:
 *       '201':
 *         description: Guest created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *       '400':
 *         description: Invalid request
 *       '500':
 *         description: Database error
 */
router.post('/', (req, res) => {
  const {
    group_id,
    group_label,
    name,
    email,
    code,
    can_bring_plus_one,
    is_primary
  } = req.body;

  // Basic validation
  if (!group_label) return res.status(400).json({ error: 'group_label is required' });
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!code) return res.status(400).json({ error: 'code is required' });
  // Email format validation
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  // Boolean validation for can_bring_plus_one
  if (typeof can_bring_plus_one !== 'undefined' &&
      can_bring_plus_one !== 0 && can_bring_plus_one !== 1 && typeof can_bring_plus_one !== 'boolean') {
    return res.status(400).json({ error: 'can_bring_plus_one must be a boolean or 0/1' });
  }

  const stmt = db.prepare(`
    INSERT INTO guests (
      group_id, group_label, name, email, code,
      can_bring_plus_one, is_primary
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    group_id,
    group_label,
    name,
    email,
    code,
    can_bring_plus_one || 0,
    typeof is_primary !== 'undefined' ? is_primary : 1,
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to create guest' });
      res.status(201).json({ id: this.lastID });
    }
  );
});

/**
 * @openapi
 * /guests/{id}:
 *   put:
 *     summary: Update an existing guest
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GuestUpdate'
 *     responses:
 *       '200':
 *         description: Guest updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '400':
 *         description: Invalid request
 *       '404':
 *         description: Guest not found
 */
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    group_label,
    can_bring_plus_one,
    is_primary,
    attending,
    dietary,
    notes,
    rsvp_deadline
  } = req.body;

  // Basic validation
  if (!group_label) return res.status(400).json({ error: 'group_label is required' });
  if (!name) return res.status(400).json({ error: 'name is required' });
  // Email format validation
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  // Boolean validation for can_bring_plus_one
  if (typeof can_bring_plus_one !== 'undefined' &&
      can_bring_plus_one !== 0 && can_bring_plus_one !== 1 && typeof can_bring_plus_one !== 'boolean') {
    return res.status(400).json({ error: 'can_bring_plus_one must be a boolean or 0/1' });
  }
  // RSVP deadline validation
  if (rsvp_deadline && isNaN(Date.parse(rsvp_deadline))) {
    return res.status(400).json({ error: 'rsvp_deadline must be a valid datetime string' });
  }

  db.get('SELECT * FROM guests WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Guest not found' });

    const isPrimaryValue = typeof is_primary !== 'undefined' ? is_primary : row.is_primary;

    const attendingValue = typeof attending !== 'undefined' ? attending : null;
    const rsvpStatusVal = attendingValue === 1 || attendingValue === 'true' || attendingValue === true
      ? 'attending'
      : attendingValue === 0 || attendingValue === 'false' || attendingValue === false
      ? 'not_attending'
      : 'pending';

    const stmt = db.prepare(`
      UPDATE guests SET
        name = ?, email = ?, group_label = ?,
        can_bring_plus_one = ?, is_primary = ?, attending = ?, rsvp_status = ?,
        dietary = ?, notes = ?, rsvp_deadline = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      name,
      email,
      group_label,
      can_bring_plus_one || 0,
      isPrimaryValue,
      attendingValue,
      rsvpStatusVal,
      dietary,
      notes,
      rsvp_deadline || null,
      id,
      function (err) {
        if (err) return res.status(500).json({ error: 'Failed to update guest' });
        res.json({ success: true });
      }
    );
  });
});

/**
 * @openapi
 * /guests/{id}:
 *   delete:
 *     summary: Delete a guest
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Guest deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '500':
 *         description: Database error
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM guests WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete guest' });
    res.json({ success: true });
  });
});

/**
 * @openapi
 * /guests/rsvp:
 *   post:
 *     summary: Create or update RSVP for a guest
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminRsvp'
 *     responses:
 *       '200':
 *         description: RSVP updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '400':
 *         description: Invalid request
 *       '404':
 *         description: Guest not found
 */
router.post('/rsvp', (req, res) => {
  const { id, attending, dietary, notes, rsvp_deadline, plus_one_name, plus_one_dietary } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Missing required field: id' });
  }
  // Check if guest exists
  db.get('SELECT * FROM guests WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Guest not found' });
    // Validation: plus_one_name only if allowed
    if (plus_one_name && !row.can_bring_plus_one) {
      return res.status(400).json({ error: 'This guest is not allowed a plus one' });
    }
    if (plus_one_dietary !== undefined && typeof plus_one_dietary !== 'string') {
      return res.status(400).json({ error: 'plus_one_dietary must be a string' });
    }
    // Determine attending and rsvp_status, preserving existing if not provided
    const attendingProvided = typeof attending !== 'undefined';
    const attendingValue = attendingProvided ? attending : row.attending;
    const rsvpStatusVal = attendingProvided
      ? (attendingValue === 1 || attendingValue === 'true' || attendingValue === true
          ? 'attending'
          : attendingValue === 0 || attendingValue === 'false' || attendingValue === false
            ? 'not_attending'
            : 'pending')
      : row.rsvp_status;
    // Enforce RSVP deadline
    if (row.rsvp_deadline && new Date(row.rsvp_deadline) < new Date()) {
      return res.status(403).json({ error: 'RSVP deadline has passed' });
    }
    // Update RSVP info
    const stmt = db.prepare(`
      UPDATE guests SET
        attending = ?,
        rsvp_status = ?,
        dietary = ?,
        notes = ?,
        rsvp_deadline = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      attendingValue,
      rsvpStatusVal,
      dietary || null,
      notes || null,
      rsvp_deadline || row.rsvp_deadline,
      id,
      function (updateErr) {
        if (updateErr) return res.status(500).json({ error: 'Failed to update RSVP' });
        // Insert secondary guest if plus_one_name is provided
        if (plus_one_name) {
          db.run(
            `INSERT INTO guests (
               group_id, group_label, name, email, code,
               can_bring_plus_one, is_primary, preferred_language,
               attending, rsvp_deadline, dietary, notes, rsvp_status
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              row.group_id,
              row.group_label,
              plus_one_name,
              null,
              null,
              0,
              0,
              row.preferred_language,
              null,
              null,
              plus_one_dietary || null,
              null,
              'pending'
            ],
            (secErr) => {
              if (secErr) logger.error('Error inserting secondary guest:', secErr);
            }
          );
        }
        // If primary RSVP is attending, mark all secondaries as attending too
        if (rsvpStatusVal === 'attending') {
          db.run(
            `UPDATE guests
             SET attending = 1,
                 rsvp_status = 'attending',
                 updated_at = CURRENT_TIMESTAMP
             WHERE group_label = ? AND is_primary = 0`,
            [row.group_label],
            (secAttendErr) => {
              if (secAttendErr) logger.error('Error updating secondary attendance:', secAttendErr);
            }
          );
        }
        res.json({ success: true });
        sendConfirmationEmail(db, {
          ...row,
          preferred_language: row.preferred_language,
          name: row.name,
          group_label: row.group_label,
          email: row.email,
          code: row.code
        });
      }
    );
  });
});

/**
 * @openapi
 * /guests/{id}/rsvp:
 *   put:
 *     summary: Update RSVP for a specific guest by ID
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdminRsvp'
 *     responses:
 *       '200':
 *         description: RSVP updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '400':
 *         description: Invalid request
 *       '404':
 *         description: Guest not found
 */
router.put('/:id/rsvp', (req, res) => {
  const { id } = req.params;
  const { attending, dietary, notes, rsvp_deadline, plus_one_name, plus_one_dietary } = req.body;

  // Check if guest exists
  db.get('SELECT * FROM guests WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Guest not found' });
    // Validation: plus_one_name only if allowed
    if (plus_one_name && !row.can_bring_plus_one) {
      return res.status(400).json({ error: 'This guest is not allowed a plus one' });
    }
    if (plus_one_dietary !== undefined && typeof plus_one_dietary !== 'string') {
      return res.status(400).json({ error: 'plus_one_dietary must be a string' });
    }

    // Determine attending and rsvp_status, preserving existing if not provided
    const attendingProvided = typeof attending !== 'undefined';
    const attendingValue = attendingProvided ? attending : row.attending;
    const rsvpStatusVal = attendingProvided
      ? (attendingValue === 1 || attendingValue === 'true' || attendingValue === true
          ? 'attending'
          : attendingValue === 0 || attendingValue === 'false' || attendingValue === false
            ? 'not_attending'
            : 'pending')
      : row.rsvp_status;

    // Enforce RSVP deadline
    if (row.rsvp_deadline && new Date(row.rsvp_deadline) < new Date()) {
      return res.status(403).json({ error: 'RSVP deadline has passed' });
    }

    // Update RSVP info
    const stmt = db.prepare(`
      UPDATE guests SET
        attending = ?,
        rsvp_status = ?,
        dietary = ?,
        notes = ?,
        rsvp_deadline = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      attendingValue,
      rsvpStatusVal,
      dietary || null,
      notes || null,
      rsvp_deadline || row.rsvp_deadline,
      id,
      function (updateErr) {
        if (updateErr) return res.status(500).json({ error: 'Failed to update RSVP' });
        // Insert secondary guest if plus_one_name is provided
        if (plus_one_name) {
          db.run(
            `INSERT INTO guests (
               group_id, group_label, name, email, code,
               can_bring_plus_one, is_primary, preferred_language,
               attending, rsvp_deadline, dietary, notes, rsvp_status
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              row.group_id,
              row.group_label,
              plus_one_name,
              null,
              null,
              0,
              0,
              row.preferred_language,
              null,
              null,
              plus_one_dietary || null,
              null,
              'pending'
            ],
            (secErr) => {
              if (secErr) logger.error('Error inserting secondary guest:', secErr);
            }
          );
        }
        // If primary RSVP is attending, mark all secondaries as attending too
        if (rsvpStatusVal === 'attending') {
          db.run(
            `UPDATE guests
             SET attending = 1,
                 rsvp_status = 'attending',
                 updated_at = CURRENT_TIMESTAMP
             WHERE group_label = ? AND is_primary = 0`,
            [row.group_label],
            (secAttendErr) => {
              if (secAttendErr) logger.error('Error updating secondary attendance:', secAttendErr);
            }
          );
        }
        res.json({ success: true });
        // Send confirmation email asynchronously
        sendConfirmationEmail(db, {
          ...row,
          preferred_language: row.preferred_language,
          name: row.name,
          group_label: row.group_label,
          email: row.email,
          code: row.code
        });
      }
    );
  });
});

module.exports = router;