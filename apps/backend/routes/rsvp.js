function formatDate(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

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

    // Fetch full group to get both primary and plus one info
    db.all(
      'SELECT * FROM guests WHERE group_id = ?',
      [guest.group_id],
      (err, guests) => {
        if (err || !guests) {
          logger.error('Failed to load guest group data: %o', err);
          return;
        }

        const primary = guests.find(g => g.is_primary);
        const plusOne = guests.find(g => !g.is_primary);

        db.get("SELECT * FROM templates WHERE name = ?", ["RSVP Confirmation"], (err, template) => {
          if (err || !template) {
            logger.error("Failed to load RSVP Confirmation template: %o", err);
            return;
          }
          const lang = primary.preferred_language === 'lt' ? 'lt' : 'en';
          const subject = template.subject;
          const bodyTemplate = lang === 'lt' ? template.body_lt : template.body_en;
          const html = bodyTemplate
            .replace(/{{\s*name\s*}}/g, primary.name)
            .replace(/{{\s*groupLabel\s*}}/g, primary.group_label)
            .replace(/{{\s*code\s*}}/g, primary.code)
            .replace(/{{\s*rsvpLink\s*}}/g, `${process.env.SITE_URL}/rsvp/${primary.code}`)
            // Use plusOne?.name for the template
            .replace(/{{\s*plusOneName\s*}}/g, plusOne?.name || '')
            .replace(/{{\s*rsvpDeadline\s*}}/g, primary.rsvp_deadline ? formatDate(primary.rsvp_deadline) : '');
          axios.post("https://api.resend.com/emails", {
            from: senderInfo,
            to: primary.email,
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
      }
    );
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
  db.all(
    `SELECT id, group_label, name, email, code, is_primary, can_bring_plus_one, dietary, notes, attending, rsvp_status, rsvp_deadline 
     FROM guests WHERE code = ? OR (group_id = (SELECT group_id FROM guests WHERE code = ?) AND is_primary = 0)`,
    [code, code],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Guest not found' });

      const primaryGuest = rows.find(row => row.is_primary);
      const plusOne = rows.find(row => !row.is_primary);

      const guest = {
        ...primaryGuest,
        plus_one_name: plusOne?.name || null,
        plus_one_dietary: plusOne?.dietary || null
      };

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
  if (plus_one_name !== undefined && plus_one_name !== null && typeof plus_one_name !== 'string') {
    return res.status(400).json({ error: 'plus_one_name must be a string' });
  }
  if (dietary !== undefined && dietary !== null && typeof dietary !== 'string') {
    return res.status(400).json({ error: 'dietary must be a string' });
  }
  if (notes !== undefined && notes !== null && typeof notes !== 'string') {
    return res.status(400).json({ error: 'notes must be a string' });
  }
  if (plus_one_dietary !== undefined && plus_one_dietary !== null && typeof plus_one_dietary !== 'string') {
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

    // Ensure group_id is set for primary guest
    if (!row.group_id) {
      db.run('UPDATE guests SET group_id = ? WHERE id = ?', [row.id, row.id], (updateErr) => {
        if (updateErr) {
          logger.error('Failed to set group_id for primary guest', updateErr);
          return res.status(500).json({ error: 'Failed to set group_id' });
        }

        // Update in-memory value for rest of logic
        row.group_id = row.id;
        proceedWithRsvp();
      });
    } else {
      proceedWithRsvp();
    }

    // Wrap the existing RSVP logic in a named function
    function proceedWithRsvp() {
      db.get(
        'SELECT * FROM guests WHERE group_id = ? AND is_primary = 0 LIMIT 1',
        [row.group_id],
        (checkErr, existingPlusOne) => {
          if (checkErr) return res.status(500).json({ error: 'Database error checking plus one' });

          // Proceed with RSVP update
          performRsvpUpdate(existingPlusOne);
        }
      );
    }

    function performRsvpUpdate(existingPlusOne) {
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

          // Handle plus one logic
          if (existingPlusOne && (plus_one_name === null || plus_one_name === '')) {
            // Delete the plus one
            db.run(
              'DELETE FROM guests WHERE id = ?',
              [existingPlusOne.id],
              (deleteErr) => {
                if (deleteErr) logger.error('Failed to delete plus one:', deleteErr);
              }
            );
          } else if (plus_one_name) {
            if (existingPlusOne) {
              // Update existing plus one
              db.run(
                `UPDATE guests SET
                  name = ?, dietary = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE id = ?`,
                [plus_one_name, plus_one_dietary || null, existingPlusOne.id],
                (updateErr) => {
                  if (updateErr) logger.error('Error updating plus one:', updateErr);
                }
              );
            } else {
              // Insert new plus one
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
                (insertErr) => {
                  if (insertErr) logger.error('Error inserting plus one:', insertErr);
                }
              );
            }
          }

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
          sendConfirmationEmail(db, row);
        }
      );
    }
  });
});

module.exports = router;