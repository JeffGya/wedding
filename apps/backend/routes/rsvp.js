const express = require('express');
const router = express.Router();
// parse JSON bodies on this router
router.use(express.json());
const getDbConnection = require('../db/connection');
const db = getDbConnection();
const axios = require('axios');
const logger = require('../helpers/logger');
const getSenderInfo = require('../helpers/getSenderInfo');

// Helper: send confirmation email
async function sendConfirmationEmail(db, guest) {
  try {
    const senderInfo = await getSenderInfo(db);
    db.get("SELECT * FROM templates WHERE name = ?", ["RSVP Confirmation"], (err, template) => {
      if (err || !template) {
        logger.error("Failed to load RSVP Confirmation template: %o", err);
        return;
      }
      const lang = guest.preferred_language === 'lt' ? 'lt' : 'en';
      const subject = template.subject;
      const bodyTemplate = lang === 'lt' ? template.body_lt : template.body_en;
      const html = bodyTemplate
        .replace(/{{\s*name\s*}}/g, guest.name)
        .replace(/{{\s*groupLabel\s*}}/g, guest.group_label)
        .replace(/{{\s*code\s*}}/g, guest.code)
        .replace(/{{\s*rsvpLink\s*}}/g, `https://yourdomain.com/rsvp/${guest.code}`);
      axios.post("https://api.resend.com/emails", {
        from: senderInfo,
        to: guest.email,
        subject,
        html
      }, {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` }
      }).then(resp => {
        logger.info("Confirmation email sent: %o", resp.data);
      }).catch(err => {
        logger.error("Error sending confirmation email: %o", err);
      });
    });
  } catch (e) {
    logger.error("Error in sendConfirmationEmail: %o", e);
  }
}

/**
 * @openapi
 * /rsvp/{code}:
 *   get:
 *     summary: Retrieve RSVP info by invitation code
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: RSVP information for the guest
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 guest:
 *                   $ref: '#/components/schemas/Guest'
 *       '400':
 *         description: Code is required
 *       '404':
 *         description: Guest not found
 *       '500':
 *         description: Database error
 */
// Public: fetch guest by code
// GET /api/rsvp/:code
router.get('/:code', (req, res) => {
  const { code } = req.params;
  if (!code) return res.status(400).json({ error: 'Code is required' });
  db.get(
    `SELECT id, group_label, name, email, code, is_primary, can_bring_plus_one, dietary, notes, attending, rsvp_status, rsvp_deadline 
     FROM guests WHERE code = ?`,
    [code],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!row) return res.status(404).json({ error: 'Guest not found' });
      const guest = { ...row };
      res.json({ success: true, guest });
    }
  );
});

/**
 * @openapi
 * /rsvp:
 *   post:
 *     summary: Public RSVP submission by invitation code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PublicRsvp'
 *     responses:
 *       '200':
 *         description: RSVP processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '400':
 *         description: Bad request (missing or invalid fields)
 *       '403':
 *         description: RSVP deadline has passed
 *       '404':
 *         description: Guest not found
 *       '500':
 *         description: Database error
 */
// Public: submit RSVP by code
// POST /api/rsvp
router.post('/', (req, res) => {
  console.log('req.body →', req.body);
  const { code, attending, plus_one_name, dietary, notes, plus_one_dietary } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });
  // Input type validation
  if (typeof attending === 'undefined') {
    return res.status(400).json({ error: 'attending is required' });
  }
  if (typeof attending !== 'boolean') {
    return res.status(400).json({ error: 'attending must be a boolean' });
  }
  if (plus_one_name !== undefined && typeof plus_one_name !== 'string') {
    return res.status(400).json({ error: 'plus_one_name must be a string' });
  }
  if (dietary !== undefined && typeof dietary !== 'string') {
    return res.status(400).json({ error: 'dietary must be a string' });
  }
  if (notes !== undefined && typeof notes !== 'string') {
    return res.status(400).json({ error: 'notes must be a string' });
  }
  if (plus_one_dietary !== undefined && typeof plus_one_dietary !== 'string') {
    return res.status(400).json({ error: 'plus_one_dietary must be a string' });
  }

  db.get('SELECT * FROM guests WHERE code = ?', [code], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    if (!row) return res.status(404).json({ error: 'Guest not found' });

    // Validation: plus_one_name only if allowed
    if (plus_one_name && !row.can_bring_plus_one) {
      return res.status(400).json({ error: 'This guest is not allowed a plus one' });
    }

    // Enforce RSVP deadline
    if (row.rsvp_deadline && new Date(row.rsvp_deadline) < new Date()) {
      return res.status(403).json({ error: 'RSVP deadline has passed' });
    }

    // Determine attending and rsvp_status
    const attendingProvided = typeof attending !== 'undefined';
    const attendingValue = attendingProvided ? attending : row.attending;
    const rsvpStatusVal = attendingProvided
      ? (attendingValue === true || attendingValue === 'true' || attendingValue === 1
          ? 'attending'
          : attendingValue === false || attendingValue === 'false' || attendingValue === 0
            ? 'not_attending'
            : 'pending')
      : row.rsvp_status;

    // Log for debugging
    logger.info(`RSVP PUBLIC UPDATE: code=${code}`, {
      attending: attendingValue,
      rsvp_status: rsvpStatusVal,
      plus_one_name: plus_one_name !== undefined ? plus_one_name : row.plus_one_name,
      dietary: dietary || null,
      notes: notes || null
    });

    const stmt = db.prepare(`
      UPDATE guests SET
        attending = ?,
        rsvp_status = ?,
        dietary = ?,
        notes = ?,
        responded_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE code = ?
    `);

    stmt.run(
      attendingValue,
      rsvpStatusVal,
      dietary || null,
      notes || null,
      code,
      function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update RSVP' });
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
        // If primary is attending, mark all secondaries in this group as attending too
        if (attendingValue === true) {
          db.run(
            `UPDATE guests
             SET attending = 1,
                 rsvp_status = 'attending',
                 updated_at = CURRENT_TIMESTAMP
             WHERE group_id = ? AND is_primary = 0`,
            [row.group_id],
            (updateSecErr) => {
              if (updateSecErr) logger.error('Error updating secondary attendance:', updateSecErr);
            }
          );
        }
        res.json({ success: true });
        // Send confirmation email asynchronously
        sendConfirmationEmail(db, row);
      }
    );
  });
});

module.exports = router;