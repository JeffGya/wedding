const express = require('express');
const router = express.Router();
const getDbConnection = require('../db/connection');
const db = getDbConnection();
let dbGet, dbAll, dbRun;
if (process.env.DB_TYPE === 'mysql') {
  dbGet = async (sql, params) => {
    const [rows] = await db.query(sql, params);
    return rows[0];
  };
  dbAll = async (sql, params) => {
    const [rows] = await db.query(sql, params);
    return rows;
  };
  dbRun = async (sql, params) => {
    const [result] = await db.query(sql, params);
    return result;
  };
} else {
  const sqlite3 = require('sqlite3').verbose();
  const util = require('util');
  dbGet = util.promisify(db.get.bind(db));
  dbAll = util.promisify(db.all.bind(db));
  dbRun = util.promisify(db.run.bind(db));
}
const requireAuth = require('../middleware/auth');
const getSenderInfo = require('../helpers/getSenderInfo');
const SITE_URL = process.env.SITE_URL || 'http://localhost:5001';
// Use Luxon for robust timezone handling
const { DateTime } = require('luxon');


function formatRsvpDeadline(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function replaceTemplateVars(template, vars) {
  if (!template) return '';
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    return vars[key] !== undefined ? vars[key] : '';
  });
}

// Protect all routes
router.use(requireAuth);
router.use((req, res, next) => {
  console.log('🧭 Route hit:', req.method, req.originalUrl);
  next();
});

/**
 * @openapi
 * /messages:
 *   post:
 *     summary: Create a new draft message
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - body_en
 *               - body_lt
 *               - status
 *             properties:
 *               subject:
 *                 type: string
 *               body_en:
 *                 type: string
 *               body_lt:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [draft, scheduled, sent]
 *               scheduledAt:
 *                 type: string
 *                 format: date-time
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       '200':
 *         description: Draft created with message ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 messageId:
 *                   type: integer
 *       '400':
 *         description: Validation error
 *       '500':
 *         description: Server error
 */
// Create a new draft message
router.post('/', async (req, res) => {
  const { subject, body_en, body_lt, status, scheduledAt, recipients } = req.body;
  // Validate required fields
  if (!subject || !body_en || !body_lt || !status) {
    return res.status(400).json({ success: false, error: 'Subject, body_en, body_lt, and status are required.' });
  }
  // Special validation for scheduled messages
  let scheduledForFinal = null;
  if (status === 'scheduled') {
    if (!scheduledAt) {
      return res.status(400).json({ success: false, error: 'Scheduled time is required for scheduled messages.' });
    }
    // Parse local Amsterdam time and convert to UTC
    let dt = DateTime.fromISO(scheduledAt, { zone: 'Europe/Amsterdam' });
    if (!dt.isValid) {
      return res.status(400).json({ success: false, error: 'Scheduled time must be a valid datetime.' });
    }
    if (dt < DateTime.utc()) {
      return res.status(400).json({ success: false, error: 'Scheduled time must be in the future.' });
    }
    scheduledForFinal = dt.toUTC().toISO();
  }
  try {
    const insertResult = await dbRun(
      `INSERT INTO messages (subject, body_en, body_lt, status, scheduled_for) VALUES (?, ?, ?, ?, ?)`,
      [subject, body_en, body_lt, status, scheduledForFinal]
    );
    const messageId = insertResult.insertId || insertResult.lastID;
    if (recipients && recipients.length) {
      const guestSql = `SELECT id, email, preferred_language FROM guests WHERE id IN (${recipients.map(() => '?').join(',')})`;
      const guests = await dbAll(guestSql, recipients);
      const insertRecipientSql = `INSERT INTO message_recipients (message_id, guest_id, email, language, delivery_status) VALUES (?, ?, ?, ?, 'pending')`;
      for (const guest of guests) {
        try {
          await dbRun(insertRecipientSql, [messageId, guest.id, guest.email, guest.preferred_language || 'en']);
        } catch (e) {
          console.error('❌ Failed to insert recipient:', guest.id, e.message);
        }
      }
    }
    res.json({ success: true, messageId });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /messages:
 *   get:
 *     summary: Retrieve all messages
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *       '500':
 *         description: Server error
 */
// Get all messages
router.get('/', async (req, res) => {
  try {
    let rows = await dbAll(`SELECT * FROM messages ORDER BY created_at DESC`, []);
    rows = rows.map(row => {
      if (row.scheduled_for) {
        const local = DateTime.fromISO(row.scheduled_for, { zone: 'utc' }).setZone('Europe/Amsterdam');
        row.scheduled_for = local.toISO({ suppressMilliseconds: true });
      }
      return row;
    });
    res.json({ success: true, messages: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /messages/templates:
 *   post:
 *     summary: Create a new message template
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TemplateCreate'
 *     responses:
 *       '200':
 *         description: Template created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 id:
 *                   type: integer
 *       '400':
 *         description: Validation error
 *       '500':
 *         description: Server error
 */
// Create a new template
router.post('/templates', async (req, res) => {
  const { name, subject, body_en, body_lt } = req.body;
  if (!name || !subject || !body_en || !body_lt) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }
  try {
    const insertResult = await dbRun(
      `INSERT INTO templates (name, subject, body_en, body_lt) VALUES (?, ?, ?, ?)`,
      [name, subject, body_en, body_lt]
    );
    const id = insertResult.insertId || insertResult.lastID;
    res.json({ success: true, id });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /messages/templates/{id}:
 *   delete:
 *     summary: Delete a message template
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
 *         description: Template deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '500':
 *         description: Server error
 */
// Delete a template
router.delete('/templates/:id', async (req, res) => {
  try {
    await dbRun(`DELETE FROM templates WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /messages/templates/{id}:
 *   get:
 *     summary: Retrieve a single message template
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
 *         description: Template object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 template:
 *                   $ref: '#/components/schemas/Template'
 *       '404':
 *         description: Template not found
 */
// Get a single template
router.get('/templates/:id', async (req, res) => {
  try {
    const row = await dbGet(`SELECT * FROM templates WHERE id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Template not found' });
    res.json({ success: true, template: row });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /messages/templates/{id}:
 *   put:
 *     summary: Update an existing message template
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
 *             $ref: '#/components/schemas/TemplateCreate'
 *     responses:
 *       '200':
 *         description: Template updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '404':
 *         description: Template not found
 *       '500':
 *         description: Server error
 */
// Update a template
router.put('/templates/:id', async (req, res) => {
  const { name, subject, body_en, body_lt } = req.body;
  if (!name || !subject || !body_en || !body_lt) {
    return res.status(400).json({ success: false, error: 'All fields are required' });
  }
  try {
    const result = await dbRun(
      `UPDATE templates SET name = ?, subject = ?, body_en = ?, body_lt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, subject, body_en, body_lt, req.params.id]
    );
    if ((result.affectedRows !== undefined && result.affectedRows === 0) ||
        (result.changes !== undefined && result.changes === 0)) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /messages/{id}:
 *   get:
 *     summary: Retrieve a single message and recipient stats
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
 *         description: Message object with recipients and stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     recipients:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     sentCount:
 *                       type: integer
 *                     failedCount:
 *                       type: integer
 */
// Get a single message
router.get('/:id', async (req, res) => {
  try {
    const row = await dbGet(`SELECT * FROM messages WHERE id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Message not found' });
    if (row.scheduled_for) {
      const local = DateTime.fromISO(row.scheduled_for, { zone: 'utc' }).setZone('Europe/Amsterdam');
      row.scheduled_for = local.toISO({ suppressMilliseconds: true });
    }
    const recipients = await dbAll(`SELECT guest_id, delivery_status FROM message_recipients WHERE message_id = ?`, [req.params.id]);
    const recipientIds = recipients.map(r => r.guest_id);
    const sentCount = recipients.filter(r => r.delivery_status === 'sent').length;
    const failedCount = recipients.filter(r => r.delivery_status === 'failed').length;
    res.json({ success: true, message: { ...row, recipients: recipientIds, sentCount, failedCount } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /messages/{id}:
 *   put:
 *     summary: Update a draft message
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
 *             $ref: '#/components/schemas/Message'
 *     responses:
 *       '200':
 *         description: Message updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: object
 */
// Update a draft message
router.put('/:id', async (req, res) => {
  const { subject, body_en, body_lt, status, scheduledAt, recipients } = req.body;
  // Basic validation
  if (!subject || !body_en || !body_lt) {
    return res.status(400).json({ success: false, error: 'subject, body_en, and body_lt are required' });
  }
  try {
    // First, check if message exists and is a draft
    const row = await dbGet(`SELECT * FROM messages WHERE id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Message not found' });
    if (row.status === 'sent') {
      return res.status(400).json({ success: false, error: 'Sent messages cannot be updated' });
    }
    // Validate status change
    const newStatus = status === 'scheduled' ? 'scheduled' : 'draft';
    let scheduled_for = null;
    if (newStatus === 'scheduled') {
      if (!scheduledAt) {
        return res.status(400).json({ success: false, error: 'Scheduled time is required for scheduled messages' });
      }
      // Parse local Amsterdam time and convert to UTC
      let dt = DateTime.fromISO(scheduledAt, { zone: 'Europe/Amsterdam' });
      if (!dt.isValid) {
        return res.status(400).json({ success: false, error: 'Scheduled time must be a valid datetime.' });
      }
      if (dt < DateTime.utc()) {
        return res.status(400).json({ success: false, error: 'Scheduled time must be in the future.' });
      }
      scheduled_for = dt.toUTC().toISO();
    }
    await dbRun(
      `UPDATE messages 
      SET subject = ?, body_en = ?, body_lt = ?, status = ?, scheduled_for = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?`,
      [subject, body_en, body_lt, newStatus, scheduled_for, req.params.id]
    );
    // Update recipients if provided
    if (Array.isArray(recipients)) {
      await dbRun(`DELETE FROM message_recipients WHERE message_id = ?`, [req.params.id]);
      const insertSql = `INSERT INTO message_recipients (message_id, guest_id, delivery_status) VALUES (?, ?, 'pending')`;
      for (const guestId of recipients) {
        try {
          await dbRun(insertSql, [req.params.id, guestId]);
        } catch (err) {
          console.error('❌ Failed to insert recipient:', guestId, err.message);
        }
      }
    }
    // Fetch updated message
    const updatedRow = await dbGet(`SELECT * FROM messages WHERE id = ?`, [req.params.id]);
    // Return recipients too
    const recips = await dbAll(`SELECT guest_id FROM message_recipients WHERE message_id = ?`, [req.params.id]);
    const recipientIds = recips.map(r => r.guest_id);
    res.json({ success: true, message: { ...updatedRow, recipients: recipientIds } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /messages/{id}:
 *   delete:
 *     summary: Delete a draft or scheduled message
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
 *         description: Message deleted
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
 *         description: Message not found
 *       '500':
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  try {
    const row = await dbGet(`SELECT status FROM messages WHERE id = ?`, [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Message not found' });
    if (row.status === 'sent') {
      return res.status(400).json({ success: false, error: 'Sent messages cannot be deleted' });
    }
    await dbRun('DELETE FROM message_recipients WHERE message_id = ?', [req.params.id]);
    await dbRun(`DELETE FROM messages WHERE id = ? AND status IN ('draft','scheduled')`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /messages/{id}/send:
 *   post:
 *     summary: Send a message to selected guests
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               guestIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       '200':
 *         description: Send results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 sentCount:
 *                   type: integer
 *                 failedCount:
 *                   type: integer
 */
// Send message to selected guests (filtered by guestIds if provided)
router.post('/:id/send', async (req, res, next) => {
  console.log('✅ Route hit: POST /:id/send — messageId:', req.params.id);
  const messageId = req.params.id;
  const guestIds = req.body?.guestIds && Array.isArray(req.body.guestIds) && req.body.guestIds.length > 0
    ? req.body.guestIds
    : null;
  // Debug: preparing to send message
  console.log('➡️ Preparing to send messageId:', messageId, 'with guestIds:', guestIds);
  // Get sender info from settings
  let senderInfo;
  try {
    senderInfo = await getSenderInfo(db);
    console.log('📫 Sender info:', senderInfo);
  } catch (err) {
    console.error('❌ Failed to fetch sender info:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch sender settings' });
  }
  try {
    // Load the message
    const message = await dbGet(`SELECT * FROM messages WHERE id = ?`, [messageId]);
    if (!message) {
      console.error('❌ No message found for ID:', messageId);
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    console.log('📦 Loaded message:', message);
    if ((!message.body_en || message.body_en.trim() === '') && (!message.body_lt || message.body_lt.trim() === '')) {
      console.error('❌ Cannot send email: message body is empty.');
      return res.status(400).json({ success: false, error: 'Cannot send email: message body is empty.' });
    }
    if (message.status !== 'draft') {
      return res.status(400).json({ success: false, error: 'Only draft messages can be sent' });
    }
    // 💡 Clear any previous logs for this message ID
    await dbRun(`DELETE FROM message_recipients WHERE message_id = ?`, [messageId]);
    // Load guest list (filtered by guestIds if provided, otherwise all guests)
    let guestSql, guestParams;
    if (guestIds && guestIds.length > 0) {
      guestSql = `SELECT * FROM guests WHERE id IN (${guestIds.map(() => '?').join(',')})`;
      guestParams = guestIds;
    } else {
      guestSql = `SELECT * FROM guests`;
      guestParams = [];
    }
    const guests = await dbAll(guestSql, guestParams);
    const results = [];
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const BATCH_SIZE = 1;
    const BATCH_DELAY = 2000;
    for (let i = 0; i < guests.length; i += BATCH_SIZE) {
      const batch = guests.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (guest) => {
        await delay(300);
        // Check for missing email before sending
        if (!guest.email) {
          console.warn('⚠️ Guest missing email, skipping:', guest.id);
          results.push({ guest_id: guest.id, status: 'failed', error: 'Missing email address' });
          return;
        }
        const name = guest.group_label || guest.name;
        const lang = guest.preferred_language === 'lt' ? 'lt' : 'en';
        const body = (lang === 'lt' ? message.body_lt : message.body_en)
          .replace(/{{\s*name\s*}}/g, name)
          .replace(/{{\s*groupLabel\s*}}/g, guest.group_label || '')
          .replace(/{{\s*code\s*}}/g, guest.code)
          .replace(/{{\s*rsvpLink\s*}}/g, `${process.env.SITE_URL}/rsvp/${guest.code}`);
        const emailData = {
          from: senderInfo,
          to: guest.email,
          subject: message.subject,
          html: body,
        };
        let retries = 0;
        const maxRetries = 3;
        const backoff = [0, 2000, 4000];
        while (retries <= maxRetries) {
          try {
            const axios = require('axios');
            const { RESEND_API_KEY } = process.env;
            // Log email data before sending
            console.log('📤 Email data to send:', emailData);
            const response = await axios.post('https://api.resend.com/emails', emailData, {
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
            });
            // Log the full response from Resend
            console.log('✅ Resend response:', {
              status: response.status,
              data: response.data,
            });
            const logSql = `INSERT INTO message_recipients (message_id, guest_id, delivery_status, sent_at, status) VALUES (?, ?, 'sent', ?, 'sent')`;
            const sentAt = new Date().toISOString();
            await dbRun(logSql, [messageId, guest.id, sentAt]);
            results.push({ guest_id: guest.id, status: 'sent' });
            break;
          } catch (err) {
            if (err.response?.status === 429 && retries < maxRetries) {
              retries++;
              await delay(backoff[retries]);
            } else {
              const errorMsg = err.response?.data
                ? JSON.stringify(err.response.data)
                : err.message;
              console.error('❌ Resend error:', errorMsg);
              const logSql = `INSERT INTO message_recipients (message_id, guest_id, delivery_status, error_message) VALUES (?, ?, 'failed', ?)`;
              await dbRun(logSql, [messageId, guest.id, errorMsg]);
              results.push({ guest_id: guest.id, status: 'failed', error: errorMsg });
              break;
            }
          }
        }
      });
      await Promise.all(batchPromises);
      if (i + BATCH_SIZE < guests.length) {
        await delay(BATCH_DELAY);
      }
    }
    // Mark message as sent
    await dbRun(`UPDATE messages SET status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [messageId]);
    const sentCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    res.json({ success: true, results, sentCount, failedCount });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /messages/{id}/schedule:
 *   post:
 *     summary: Schedule a message for future sending
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
 *             type: object
 *             required:
 *               - scheduled_for
 *             properties:
 *               scheduled_for:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       '200':
 *         description: Message scheduled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 scheduled_for:
 *                   type: string
 *                   format: date-time
 */
// Schedule a message
router.post('/:id/schedule', async (req, res) => {
  const messageId = req.params.id;
  const { scheduled_for } = req.body;
  if (!scheduled_for) {
    return res.status(400).json({ success: false, error: 'scheduled_for field is required' });
  }
  const dt = DateTime.fromISO(scheduled_for, { zone: 'Europe/Amsterdam' });
  if (!dt.isValid) {
    return res.status(400).json({ success: false, error: 'scheduled_for must be a valid datetime' });
  }
  if (dt < DateTime.utc()) {
    return res.status(400).json({ success: false, error: 'scheduled_for must be in the future' });
  }
  try {
    const scheduledUtc = dt.toUTC().toISO();
    await dbRun(`UPDATE messages SET scheduled_for = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [scheduledUtc, messageId]);
    res.json({ success: true, scheduled_for: scheduledUtc });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /messages/{id}/logs:
 *   get:
 *     summary: Get delivery logs for a message
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
 *         description: Delivery logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MessageLog'
 */
// Get delivery logs for a message
router.get('/:id/logs', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT mr.id, mr.guest_id, g.name, g.group_label, g.email, mr.delivery_status, mr.error_message, mr.created_at
       FROM message_recipients mr
       JOIN guests g ON g.id = mr.guest_id
       WHERE mr.message_id = ?
       ORDER BY mr.created_at DESC`,
      [req.params.id]
    );
    res.json({ success: true, logs: rows });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /messages/preview:
 *   post:
 *     summary: Preview a message with guest substitutions
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - template
 *               - guest
 *             properties:
 *               template:
 *                 $ref: '#/components/schemas/Template'
 *               guest:
 *                 $ref: '#/components/schemas/Guest'
 *     responses:
 *       '200':
 *         description: Rendered subject and body
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 subject:
 *                   type: string
 *                 body:
 *                   type: string
 */
// Preview a message with guest substitutions
router.post('/preview', (req, res) => {
  const { template, guest } = req.body;

  if (!template || !guest) {
    return res.status(400).json({ success: false, error: 'Template and guest info are required' });
  }

  const lang = guest.preferred_language === 'lt' ? 'lt' : 'en';

  const replacements = {
    guestName: guest.name,
    groupLabel: guest.group_label,
    rsvpLink: `${SITE_URL}/${lang}/rsvp/${guest.code}`,
    plusOneName: guest.plus_one_name || '',
    rsvpDeadline: formatRsvpDeadline(guest.rsvp_deadline)
  };

  const body_en = replaceTemplateVars(template.body_en, {
    guestName: guest.name,
    groupLabel: guest.group_label,
    rsvpLink: `${SITE_URL}/en/rsvp/${guest.code}`,
    plusOneName: guest.plus_one_name || '',
    rsvpDeadline: formatRsvpDeadline(guest.rsvp_deadline)
  });
  const body_lt = replaceTemplateVars(template.body_lt, {
    guestName: guest.name,
    groupLabel: guest.group_label,
    rsvpLink: `${SITE_URL}/lt/rsvp/${guest.code}`,
    plusOneName: guest.plus_one_name || '',
    rsvpDeadline: formatRsvpDeadline(guest.rsvp_deadline)
  });

  const body = lang === 'lt' ? body_lt : body_en;
  const subject = replaceTemplateVars(template.subject, replacements);

  res.json({ success: true, subject, body });
});

/**
 * @openapi
 * /messages/{id}/resend:
 *   post:
 *     summary: Resend failed message deliveries
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
 *         description: Resend results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 sentCount:
 *                   type: integer
 *                 failedCount:
 *                   type: integer
 */
// Resend failed messages
router.post('/:id/resend', async (req, res, next) => {
  const messageId = req.params.id;
  try {
    const senderInfo = await getSenderInfo(db);
    const message = await dbGet(`SELECT * FROM messages WHERE id = ?`, [messageId]);
    if (!message) return res.status(404).json({ success: false, error: 'Message not found' });
    // Load failed recipients only
    const guests = await dbAll(
      `SELECT g.* FROM message_recipients mr JOIN guests g ON g.id = mr.guest_id WHERE mr.message_id = ? AND mr.delivery_status = 'failed'`,
      [messageId]
    );
    const results = [];
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const BATCH_SIZE = 1;
    const BATCH_DELAY = 2000;
    for (let i = 0; i < guests.length; i += BATCH_SIZE) {
      const batch = guests.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (guest) => {
        await delay(300);
        // Check for missing email before sending
        if (!guest.email) {
          console.warn('⚠️ Guest missing email, skipping:', guest.id);
          results.push({ guest_id: guest.id, status: 'failed', error: 'Missing email address' });
          return;
        }
        const name = guest.group_label || guest.name;
        const lang = guest.preferred_language === 'lt' ? 'lt' : 'en';
        const body = (lang === 'lt' ? message.body_lt : message.body_en)
          .replace(/{{\s*name\s*}}/g, name)
          .replace(/{{\s*groupLabel\s*}}/g, guest.group_label || '')
          .replace(/{{\s*code\s*}}/g, guest.code)
          .replace(/{{\s*rsvpLink\s*}}/g, `${process.env.SITE_URL}/rsvp/${guest.code}`);
        const emailData = {
          from: senderInfo,
          to: guest.email,
          subject: message.subject,
          html: body,
        };
        let retries = 0;
        const maxRetries = 3;
        const backoff = [0, 2000, 4000];
        while (retries <= maxRetries) {
          try {
            const axios = require('axios');
            const { RESEND_API_KEY } = process.env;
            const response = await axios.post('https://api.resend.com/emails', emailData, {
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
            });
            // Log the full response from Resend
            console.log('✅ Resend response:', {
              status: response.status,
              data: response.data,
            });
            const sentAt = new Date().toISOString();
            const logSql = `UPDATE message_recipients SET delivery_status = 'sent', sent_at = ?, status = 'sent', error_message = NULL WHERE message_id = ? AND guest_id = ?`;
            await dbRun(logSql, [sentAt, messageId, guest.id]);
            results.push({ guest_id: guest.id, status: 'sent' });
            break;
          } catch (err) {
            if (err.response?.status === 429 && retries < maxRetries) {
              retries++;
              await delay(backoff[retries]);
            } else {
              const errorMsg = err.response?.data
                ? JSON.stringify(err.response.data)
                : err.message;
              console.error('❌ Resend error:', errorMsg);
              const logSql = `UPDATE message_recipients SET delivery_status = 'failed', error_message = ? WHERE message_id = ? AND guest_id = ?`;
              await dbRun(logSql, [errorMsg, messageId, guest.id]);
              results.push({ guest_id: guest.id, status: 'failed', error: errorMsg });
              break;
            }
          }
        }
      });
      await Promise.all(batchPromises);
      if (i + BATCH_SIZE < guests.length) {
        await delay(BATCH_DELAY);
      }
    }
    const sentCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    res.json({ success: true, results, sentCount, failedCount });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
