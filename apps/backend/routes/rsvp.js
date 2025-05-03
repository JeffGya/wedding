const express = require('express');
const router = express.Router();
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

// Public: fetch guest by code
// GET /api/rsvp/:code
router.get('/:code', (req, res) => {
  const { code } = req.params;
  if (!code) return res.status(400).json({ error: 'Code is required' });
  db.get(
    `SELECT id, group_label, name, email, code, can_bring_plus_one, num_kids, dietary, notes, attending, rsvp_status, meal_preference, rsvp_deadline 
     FROM guests WHERE code = ?`,
    [code],
    (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!row) return res.status(404).json({ error: 'Guest not found' });
      // Exclude plus_one_name if guest not allowed a plus one
      const guest = { ...row };
      if (!guest.can_bring_plus_one) {
        delete guest.plus_one_name;
      }
      res.json({ success: true, guest });
    }
  );
});

// Public: submit RSVP by code
// POST /api/rsvp
router.post('/', (req, res) => {
  const { code, attending, plus_one_name, dietary, notes, num_kids, meal_preference } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });
  // Input type validation
  if (typeof attending === 'undefined') {
    return res.status(400).json({ error: 'attending is required' });
  }
  if (typeof attending !== 'boolean') {
    return res.status(400).json({ error: 'attending must be a boolean' });
  }
  if (typeof num_kids !== 'undefined' && (!Number.isInteger(num_kids) || num_kids < 0)) {
    return res.status(400).json({ error: 'num_kids must be a non-negative integer' });
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
  if (meal_preference !== undefined && typeof meal_preference !== 'string') {
    return res.status(400).json({ error: 'meal_preference must be a string' });
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
      notes: notes || null,
      num_kids: typeof num_kids !== 'undefined' ? num_kids : row.num_kids,
      meal_preference: meal_preference || row.meal_preference
    });

    const stmt = db.prepare(`
      UPDATE guests SET
        attending = ?,
        rsvp_status = ?,
        plus_one_name = ?,
        dietary = ?,
        notes = ?,
        num_kids = ?,
        meal_preference = ?,
        responded_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE code = ?
    `);

    stmt.run(
      attendingValue,
      rsvpStatusVal,
      plus_one_name !== undefined ? plus_one_name : row.plus_one_name,
      dietary || null,
      notes || null,
      typeof num_kids !== 'undefined' ? num_kids : row.num_kids,
      meal_preference || row.meal_preference,
      code,
      function(err) {
        if (err) return res.status(500).json({ error: 'Failed to update RSVP' });
        res.json({ success: true });
        // Send confirmation email asynchronously
        sendConfirmationEmail(db, row);
      }
    );
  });
});

module.exports = router;