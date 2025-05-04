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

// GET /api/guests - List all guests with filtering, sorting, and pagination
router.get('/', (req, res) => {
  const { attending, group_id, rsvp_status, sort_by, page = 1, per_page = 40 } = req.query;

  let query = `
    SELECT id, name, attending, rsvp_status, plus_one_name, dietary, notes, rsvp_deadline, updated_at, group_id, group_label, email, code, can_bring_plus_one, num_kids, meal_preference
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

// GET /api/guests/analytics - RSVP statistics by status
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
  // num_kids validation
  if (typeof num_kids !== 'undefined' && (!Number.isInteger(num_kids) || num_kids < 0)) {
    return res.status(400).json({ error: 'num_kids must be a non-negative integer' });
  }

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
  // num_kids validation
  if (typeof num_kids !== 'undefined' && (!Number.isInteger(num_kids) || num_kids < 0)) {
    return res.status(400).json({ error: 'num_kids must be a non-negative integer' });
  }
  // RSVP deadline validation
  if (rsvp_deadline && isNaN(Date.parse(rsvp_deadline))) {
    return res.status(400).json({ error: 'rsvp_deadline must be a valid datetime string' });
  }

  const attendingValue = typeof attending !== 'undefined' ? attending : null;
  const rsvpStatusVal = attendingValue === 1 || attendingValue === 'true' || attendingValue === true
    ? 'attending'
    : attendingValue === 0 || attendingValue === 'false' || attendingValue === false
    ? 'not_attending'
    : 'pending';

  const stmt = db.prepare(`
    UPDATE guests SET
      name = ?, email = ?, group_label = ?,
      can_bring_plus_one = ?, num_kids = ?, attending = ?, rsvp_status = ?,
      dietary = ?, notes = ?, rsvp_deadline = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  stmt.run(
    name,
    email,
    group_label,
    can_bring_plus_one || 0,
    num_kids || 0,
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
  
  // Check if guest exists
  db.get('SELECT * FROM guests WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Guest not found' });
    // Validation: plus_one_name only if allowed
    if (plus_one_name && !row.can_bring_plus_one) {
      return res.status(400).json({ error: 'This guest is not allowed a plus one' });
    }
    // Validate num_kids
    if (typeof num_kids !== 'undefined' && (!Number.isInteger(num_kids) || num_kids < 0)) {
      return res.status(400).json({ error: 'num_kids must be a non-negative integer' });
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
        num_kids = ?,
        plus_one_name = ?,
        meal_preference = ?,
        rsvp_deadline = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      attendingValue,
      rsvpStatusVal,
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

// RSVP: Update RSVP for a specific guest by id
// PUT /api/guests/:id/rsvp
router.put('/:id/rsvp', (req, res) => {
  const { id } = req.params;
  const { attending, dietary, notes, num_kids, plus_one_name, rsvp_deadline } = req.body;

  // Check if guest exists
  db.get('SELECT * FROM guests WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Guest not found' });
    // Validation: plus_one_name only if allowed
    if (plus_one_name && !row.can_bring_plus_one) {
      return res.status(400).json({ error: 'This guest is not allowed a plus one' });
    }
    // Validate num_kids
    if (typeof num_kids !== 'undefined' && (!Number.isInteger(num_kids) || num_kids < 0)) {
      return res.status(400).json({ error: 'num_kids must be a non-negative integer' });
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
        num_kids = ?,
        plus_one_name = ?,
        rsvp_deadline = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      attendingValue,
      rsvpStatusVal,
      dietary || null,
      notes || null,
      typeof num_kids !== 'undefined' ? num_kids : row.num_kids,
      plus_one_name !== undefined ? plus_one_name : row.plus_one_name,
      rsvp_deadline !== undefined ? rsvp_deadline : row.rsvp_deadline,
      id,
      function (updateErr) {
        if (updateErr) return res.status(500).json({ error: 'Failed to update RSVP' });
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