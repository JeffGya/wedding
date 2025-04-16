const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const requireAuth = require('../middleware/auth');

// Protect all routes
router.use(requireAuth);

// Create a new draft message
router.post('/', (req, res) => {
  const { subject, body_en, body_lt } = req.body;
  const sql = `INSERT INTO messages (subject, body_en, body_lt, status) VALUES (?, ?, ?, 'draft')`;

  db.run(sql, [subject, body_en, body_lt], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

// Get all messages
router.get('/', (req, res) => {
  const sql = `SELECT * FROM messages ORDER BY created_at DESC`;

  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, messages: rows });
  });
});

// Get all templates
router.get('/templates', (req, res) => {
  const sql = `SELECT * FROM templates ORDER BY created_at DESC`;

  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, templates: rows });
  });
});

// Create a new template
router.post('/templates', (req, res) => {
  const { name, subject, body_en, body_lt } = req.body;

  if (!name || !subject || !body_en || !body_lt) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  const sql = `INSERT INTO templates (name, subject, body_en, body_lt) VALUES (?, ?, ?, ?)`;
  db.run(sql, [name, subject, body_en, body_lt], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, id: this.lastID });
  });
});

// Delete a template
router.delete('/templates/:id', (req, res) => {
  const sql = `DELETE FROM templates WHERE id = ?`;
  db.run(sql, [req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

// Get a single message
router.get('/:id', (req, res) => {
  const sql = `SELECT * FROM messages WHERE id = ?`;

  db.get(sql, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!row) return res.status(404).json({ success: false, error: 'Message not found' });
    res.json({ success: true, message: row });
  });
});

// Update a draft message
router.put('/:id', (req, res) => {
  const { subject, body_en, body_lt } = req.body;

  // Basic validation
  if (!subject || !body_en || !body_lt) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }

  // First, check if message exists and is a draft
  const checkSql = `SELECT * FROM messages WHERE id = ?`;
  db.get(checkSql, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!row) return res.status(404).json({ success: false, error: 'Message not found' });
    if (row.status !== 'draft') {
      return res.status(400).json({ success: false, error: 'Only draft messages can be updated' });
    }

    // Proceed to update
    const sql = `UPDATE messages SET subject = ?, body_en = ?, body_lt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;

    db.run(sql, [subject, body_en, body_lt, req.params.id], function (err) {
      if (err) return res.status(500).json({ success: false, error: err.message });

      // Return updated message
      const fetchSql = `SELECT * FROM messages WHERE id = ?`;
      db.get(fetchSql, [req.params.id], (err, updatedRow) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: updatedRow });
      });
    });
  });
});

// Delete a message
router.delete('/:id', (req, res) => {
  const sql = `DELETE FROM messages WHERE id = ? AND status = 'draft'`;

  db.run(sql, [req.params.id], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

// Send message to selected guests
router.post('/:id/send', async (req, res) => {
  const messageId = req.params.id;
  const guestIds = req.body.guestIds; // Optional

  // Load the message
  const messageSql = `SELECT * FROM messages WHERE id = ?`;
  db.get(messageSql, [messageId], async (err, message) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!message) return res.status(404).json({ success: false, error: 'Message not found' });
    if (message.status !== 'draft') {
      return res.status(400).json({ success: false, error: 'Only draft messages can be sent' });
    }

    // Load guest list (filtered or all)
    const guestSql = guestIds?.length
      ? `SELECT * FROM guests WHERE id IN (${guestIds.map(() => '?').join(',')})`
      : `SELECT * FROM guests`;

    db.all(guestSql, guestIds || [], async (err, guests) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      const results = [];

      for (const guest of guests) {
        const name = guest.group_label || guest.name;
        const lang = guest.preferred_language === 'lt' ? 'lt' : 'en';
        const body = (lang === 'lt' ? message.body_lt : message.body_en)
          .replace(/{{\s*name\s*}}/g, name)
          .replace(/{{\s*groupLabel\s*}}/g, guest.group_label || '')
          .replace(/{{\s*code\s*}}/g, guest.code)
          .replace(/{{\s*rsvpLink\s*}}/g, `https://yourdomain.com/rsvp/${guest.code}`);

        const emailData = {
          from: 'Your Wedding Site <onboarding@resend.dev>', // use real sender in production
          to: guest.email,
          subject: message.subject,
          html: body,
        };

        try {
          const axios = require('axios');
          const { RESEND_API_KEY } = process.env;

          const response = await axios.post('https://api.resend.com/emails', emailData, {
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
          });

          // Log success
          const logSql = `INSERT INTO message_recipients (message_id, guest_id, delivery_status) VALUES (?, ?, 'sent')`;
          db.run(logSql, [messageId, guest.id]);
          results.push({ guest_id: guest.id, status: 'sent' });
        } catch (err) {
          // Log failure
          const logSql = `INSERT INTO message_recipients (message_id, guest_id, delivery_status, error_message) VALUES (?, ?, 'failed', ?)`;
          db.run(logSql, [messageId, guest.id, err.message]);
          results.push({ guest_id: guest.id, status: 'failed', error: err.message });
        }
      }

      // Mark message as sent
      db.run(`UPDATE messages SET status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [messageId]);
      res.json({ success: true, results });
    });
  });
});

// Schedule a message
router.post('/:id/schedule', (req, res) => {
  const messageId = req.params.id;
  const { scheduled_for } = req.body;

  if (!scheduled_for) {
    return res.status(400).json({ success: false, error: 'scheduled_for field is required' });
  }

  const date = new Date(scheduled_for);
  const now = new Date();

  if (isNaN(date.getTime()) || date < now) {
    return res.status(400).json({ success: false, error: 'scheduled_for must be a valid future datetime' });
  }

  const sql = `UPDATE messages SET scheduled_for = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  db.run(sql, [scheduled_for, messageId], function (err) {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, scheduled_for });
  });
});

// Get delivery logs for a message
router.get('/:id/logs', (req, res) => {
  const messageId = req.params.id;
  const sql = `
    SELECT 
      mr.id,
      mr.guest_id,
      g.name,
      g.group_label,
      g.email,
      mr.delivery_status,
      mr.error_message,
      mr.created_at
    FROM message_recipients mr
    JOIN guests g ON g.id = mr.guest_id
    WHERE mr.message_id = ?
    ORDER BY mr.created_at DESC
  `;

  db.all(sql, [messageId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, logs: rows });
  });
});

// Preview a message with guest substitutions
router.post('/preview', (req, res) => {
  const { template, guest } = req.body;

  if (!template || !guest) {
    return res.status(400).json({ success: false, error: 'Template and guest info are required' });
  }

  const name = guest.group_label || guest.name;
  const lang = guest.preferred_language === 'lt' ? 'lt' : 'en';

  const body = (lang === 'lt' ? template.body_lt : template.body_en || '')
    .replace(/{{\s*name\s*}}/g, name)
    .replace(/{{\s*groupLabel\s*}}/g, guest.group_label || '')
    .replace(/{{\s*code\s*}}/g, guest.code || '')
    .replace(/{{\s*rsvpLink\s*}}/g, `https://yourdomain.com/rsvp/${guest.code || ''}`);

  const subject = template.subject.replace(/{{\s*name\s*}}/g, name)
    .replace(/{{\s*groupLabel\s*}}/g, guest.group_label || '')
    .replace(/{{\s*code\s*}}/g, guest.code || '')
    .replace(/{{\s*rsvpLink\s*}}/g, `https://yourdomain.com/rsvp/${guest.code || ''}`);

  res.json({ success: true, subject, body });
});

module.exports = router;
