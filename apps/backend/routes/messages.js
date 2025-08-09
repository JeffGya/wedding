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
const logger = require('../helpers/logger');

// Function to get inline styles for email templates (Gmail-compatible)
function getInlineStyles(style) {
  const styles = {
    elegant: {
      fontFamily: 'Lora, Georgia, serif',
      color: '#333333',
      lineHeight: '1.6',
      padding: '20px',
      backgroundColor: '#F5F5DC',
      border: '2px solid #D2B48C',
      textAlign: 'left',
      fontSize: '16px',
      borderRadius: '8px',
      maxWidth: '600px',
      margin: '0 auto'
    },
    modern: {
      fontFamily: 'Open Sans, Arial, sans-serif',
      color: '#333333',
      lineHeight: '1.5',
      padding: '20px',
      backgroundColor: '#F8F8F8',
      border: '1px solid #CCCCCC',
      textAlign: 'left',
      fontSize: '16px',
      borderRadius: '12px',
      maxWidth: '600px',
      margin: '0 auto',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    },
    friendly: {
      fontFamily: 'Open Sans, Arial, sans-serif',
      color: '#333333',
      lineHeight: '1.6',
      padding: '20px',
      backgroundColor: '#FFF8DC',
      border: '2px solid #DEB887',
      textAlign: 'left',
      fontSize: '16px',
      borderRadius: '16px',
      maxWidth: '600px',
      margin: '0 auto'
    }
  };
  
  return styles[style] || styles.elegant;
}

// Function to convert style object to inline CSS string
function styleObjectToInline(styleObj) {
  return Object.entries(styleObj)
    .map(([key, value]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${value}`)
    .join('; ');
}
const { replaceTemplateVars, getTemplateVariables } = require('../utils/templateVariables');
const { generateEmailHTML } = require('../utils/emailTemplates');


function formatRsvpDeadline(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Remove the old replaceTemplateVars function (lines 41-45)
// Remove the old formatRsvpDeadline function (lines 33-39)

// Protect all routes
router.use(requireAuth);
// Replace the existing console-based route hit middleware:
router.use((req, res, next) => {
  logger.debug('🧭 Route hit:', req.method, req.originalUrl);
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
  logger.debug('🧰 [messages.js] POST /api/messages hit with headers:', req.headers);
  logger.debug('🧰 [messages.js] POST /api/messages hit with body:', req.body);
  logger.debug('🧰 [messages.js] POST /messages hit with body:', req.body);
  const { subject, body_en, body_lt, status, scheduledAt, recipients, style = 'elegant' } = req.body;
  logger.debug('🧰 [messages.js] Extracted fields:', { subject, body_en, body_lt, status, scheduledAt, recipients, style });
  // Validate required fields
  if (!subject || !body_en || !body_lt || !status) {
    return res.status(400).json({ success: false, error: 'Subject, body_en, body_lt, and status are required.' });
  }
  // Special validation for scheduled messages
  let scheduledForFinal = null;
  if (status === 'scheduled') {
    logger.debug('🧰 [messages.js] Status is scheduled; scheduledAt:', scheduledAt);
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
    // Format scheduledForFinal for MySQL DATETIME (YYYY-MM-DD HH:mm:ss)
    scheduledForFinal = dt.toUTC().toFormat('yyyy-MM-dd HH:mm:ss');
    logger.debug('🧰 [messages.js] Formatted scheduledForFinal for MySQL:', scheduledForFinal);
  }
  try {
    logger.debug('🧰 [messages.js] Inserting message with params:', [subject, body_en, body_lt, status, scheduledForFinal, style]);
    const insertResult = await dbRun(
      `INSERT INTO messages (subject, body_en, body_lt, status, scheduled_for, style) VALUES (?, ?, ?, ?, ?, ?)`,
      [subject, body_en, body_lt, status, scheduledForFinal, style]
    );
    const messageId = insertResult.insertId || insertResult.lastID;
    logger.debug('🧰 [messages.js] Inserted messageId:', messageId);
    if (recipients && recipients.length) {
      logger.debug('🧰 [messages.js] Recipients provided:', recipients);
      const guestSql = `SELECT id, email, preferred_language FROM guests WHERE id IN (${recipients.map(() => '?').join(',')})`;
      const guests = await dbAll(guestSql, recipients);
      logger.debug('🧰 [messages.js] Guests fetched for recipients:', guests);
      const insertRecipientSql = `INSERT INTO message_recipients (message_id, guest_id, email, language, delivery_status) VALUES (?, ?, ?, ?, 'pending')`;
      for (const guest of guests) {
        logger.debug('🧰 [messages.js] Inserting recipient for guest:', guest);
        try {
          await dbRun(insertRecipientSql, [messageId, guest.id, guest.email, guest.preferred_language || 'en']);
        } catch (e) {
          logger.error('❌ Failed to insert recipient:', guest.id, e.message);
        }
      }
    }
    res.json({ success: true, messageId });
  } catch (err) {
    logger.error('❌ [messages.js] Error creating message:', err);
    logger.error(err.stack);
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
    // Explicitly select scheduled_for so it's included
    const rows = await dbAll(
      `SELECT id, subject, status, scheduled_for, created_at, updated_at
       FROM messages
       ORDER BY created_at DESC`,
      []
    );
    // Normalize dates to ISO strings for frontend, handling both Date and string forms
    const messages = rows.map(row => {
      if (row.scheduled_for) {
        let scheduledDate;
        if (row.scheduled_for instanceof Date) {
          scheduledDate = row.scheduled_for;
        } else {
          // Convert "YYYY-MM-DD HH:mm:ss" to ISO with Z
          scheduledDate = new Date(row.scheduled_for.replace(' ', 'T') + 'Z');
        }
        row.scheduled_for = scheduledDate.toISOString();
      }
      // created_at
      if (row.created_at instanceof Date) {
        row.created_at = row.created_at.toISOString();
      } else {
        row.created_at = new Date(row.created_at).toISOString();
      }
      // updated_at
      if (row.updated_at instanceof Date) {
        row.updated_at = row.updated_at.toISOString();
      } else {
        row.updated_at = new Date(row.updated_at).toISOString();
      }
      return row;
    });
    res.json({ success: true, messages });
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
    // Convert created_at and updated_at to ISO strings
    if (row.created_at) {
      row.created_at = new Date(row.created_at).toISOString();
    }
    if (row.updated_at) {
      row.updated_at = new Date(row.updated_at).toISOString();
    }
    const recipients = await dbAll(`SELECT guest_id, delivery_status FROM message_recipients WHERE message_id = ?`, [req.params.id]);
    recipients.forEach(r => {
      if (r.created_at) {
        r.created_at = new Date(r.created_at).toISOString();
      }
    });
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
      // Format scheduled_for for MySQL DATETIME (YYYY-MM-DD HH:mm:ss)
      scheduled_for = dt.toUTC().toFormat('yyyy-MM-dd HH:mm:ss');
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
          logger.error('❌ Failed to insert recipient:', guestId, err.message);
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
  logger.debug('✅ Route hit: POST /:id/send — messageId:', req.params.id);
  const messageId = req.params.id;
  const guestIds = req.body?.guestIds && Array.isArray(req.body.guestIds) && req.body.guestIds.length > 0
    ? req.body.guestIds
    : null;
  // Debug: preparing to send message
  logger.debug('➡️ Preparing to send messageId:', messageId, 'with guestIds:', guestIds);
  // Get sender info from settings
  let senderInfo;
  try {
    senderInfo = await getSenderInfo(db);
    logger.debug('📫 Sender info:', senderInfo);
  } catch (err) {
    logger.error('❌ Failed to fetch sender info:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch sender settings' });
  }
  try {
    // Load the message
    const message = await dbGet(`SELECT * FROM messages WHERE id = ?`, [messageId]);
    if (!message) {
      logger.error('❌ No message found for ID:', messageId);
      return res.status(404).json({ success: false, error: 'Message not found' });
    }
    logger.debug('📦 Loaded message:', message);
    if ((!message.body_en || message.body_en.trim() === '') && (!message.body_lt || message.body_lt.trim() === '')) {
      logger.error('❌ Cannot send email: message body is empty.');
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
          logger.warn('⚠️ Guest missing email, skipping:', guest.id);
          results.push({ guest_id: guest.id, status: 'failed', error: 'Missing email address' });
          return;
        }
        const name = guest.group_label || guest.name;
        const lang = guest.preferred_language === 'lt' ? 'lt' : 'en';
        
        // Get enhanced variables for this guest
        const variables = await getTemplateVariables(guest, message);
        
        // Replace variables in message content
        const body_en = replaceTemplateVars(message.body_en, variables);
        const body_lt = replaceTemplateVars(message.body_lt, variables);
        const subject = replaceTemplateVars(message.subject, variables);
        
        // Apply shared email template system for consistent, inline-styled HTML
        const styleKey = message.style || 'elegant';
        const emailHtmlEn = generateEmailHTML(body_en, styleKey, {});
        const emailHtmlLt = generateEmailHTML(body_lt, styleKey, {});
        
        // Send email using Resend
        const emailData = {
          from: senderInfo,
          to: guest.email,
          subject: subject,
          html: guest.language === 'lt' ? emailHtmlLt : emailHtmlEn
        };
        let retries = 0;
        const maxRetries = 3;
        const backoff = [0, 2000, 4000];
        while (retries <= maxRetries) {
          try {
            const axios = require('axios');
            const { RESEND_API_KEY } = process.env;
            // Log email data before sending
            logger.debug('📤 Email data to send:', emailData);
            const response = await axios.post('https://api.resend.com/emails', emailData, {
              headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
            });
            // Log the full response from Resend
            logger.debug('✅ Resend response:', {
              status: response.status,
              data: response.data,
            });
            
            // Check if Resend accepted the email for delivery
            if (response.status === 200 && response.data && response.data.id) {
              // Resend accepted the email - mark as sent
              logger.info('✅ Email accepted by Resend for delivery:', response.data.id);
              const logSql = `INSERT INTO message_recipients (message_id, guest_id, delivery_status, sent_at, status, resend_message_id) VALUES (?, ?, 'sent', ?, 'sent', ?)`;
              // Format timestamp for MySQL DATETIME (YYYY-MM-DD HH:mm:ss)
              const sentAt = DateTime.utc().toFormat('yyyy-MM-dd HH:mm:ss');
              logger.debug('🧰 [messages.js] Formatted sentAt for MySQL:', sentAt);
              await dbRun(logSql, [messageId, guest.id, sentAt, response.data.id]);
              results.push({ guest_id: guest.id, status: 'sent', resendId: response.data.id });
            } else {
              // Resend didn't accept the email - mark as failed
              logger.error('❌ Resend didn\'t accept email for delivery:', response.data);
              const errorMsg = 'Resend API did not accept email for delivery';
              const logSql = `INSERT INTO message_recipients (message_id, guest_id, delivery_status, error_message) VALUES (?, ?, 'failed', ?)`;
              await dbRun(logSql, [messageId, guest.id, errorMsg]);
              results.push({ guest_id: guest.id, status: 'failed', error: errorMsg });
            }
            break;
          } catch (err) {
            if (err.response?.status === 429 && retries < maxRetries) {
              retries++;
              await delay(backoff[retries]);
            } else {
              const errorMsg = err.response?.data
                ? JSON.stringify(err.response.data)
                : err.message;
              logger.error('❌ Resend error:', errorMsg);
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
    
    // Calculate results before updating message status
    const sentCount = results.filter(r => r.status === 'sent').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    
    // Only mark message as sent if at least some emails were sent successfully
    if (sentCount > 0) {
      logger.info('✅ Marking message as sent -', sentCount, 'emails sent successfully');
      await dbRun(`UPDATE messages SET status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [messageId]);
    } else {
      logger.info('❌ Keeping message as draft - all emails failed');
      await dbRun(`UPDATE messages SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [messageId]);
    }
    
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
    // Format scheduled_for for MySQL DATETIME (YYYY-MM-DD HH:mm:ss)
    const formattedScheduled = dt.toUTC().toFormat('yyyy-MM-dd HH:mm:ss');
    await dbRun(`UPDATE messages SET scheduled_for = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [formattedScheduled, messageId]);
    res.json({ success: true, scheduled_for: formattedScheduled });
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
    rows.forEach(r => {
      if (r.created_at) {
        r.created_at = new Date(r.created_at).toISOString();
      }
    });
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
router.post('/preview', async (req, res) => {
  try {
    const { template, guest, guestId } = req.body;
    const subjectRaw = template?.subject ?? req.body.subject ?? '';
    const style = template?.style ?? req.body.style ?? 'elegant';
    const tpl = {
      subject: subjectRaw,
      body_en: template?.body_en ?? req.body.bodyEn ?? '',
      body_lt: template?.body_lt ?? req.body.bodyLt ?? '',
      style,
    };

    // Resolve selected guest and sample guests
    let selectedGuest = guest || null;
    if (!selectedGuest && guestId) {
      selectedGuest = await dbGet('SELECT * FROM guests WHERE id = ?', [guestId]);
    }
    let sampleGuests = [];
    if (!selectedGuest) {
      sampleGuests = await dbAll(
        `SELECT id, name, email, group_label, preferred_language, rsvp_status, can_bring_plus_one, code
         FROM guests WHERE email IS NOT NULL ORDER BY name LIMIT 5`,
        []
      );
      selectedGuest = sampleGuests[0] || {
        id: null,
        name: 'Guest',
        group_label: 'Friends',
        code: 'ABC123',
        preferred_language: 'en',
        rsvp_status: 'pending',
        can_bring_plus_one: 0,
      };
    }

    // Compute variables and replace
    const variables = await getTemplateVariables(selectedGuest, tpl);
    const body_en = replaceTemplateVars(tpl.body_en, variables);
    const body_lt = replaceTemplateVars(tpl.body_lt, variables);
    const subject = replaceTemplateVars(tpl.subject, variables);

    // Generate email HTML for both languages without action button
    const email_html_en = generateEmailHTML(body_en, style, { buttonText: null, buttonUrl: null });
    const email_html_lt = generateEmailHTML(body_lt, style, { buttonText: null, buttonUrl: null });

    return res.json({
      success: true,
      subject,
      body_en,
      body_lt,
      email_html_en,
      email_html_lt,
      style,
      sampleGuests,
      selectedGuest: selectedGuest && selectedGuest.id ? {
        id: selectedGuest.id,
        name: selectedGuest.name,
        email: selectedGuest.email,
        group_label: selectedGuest.group_label,
        preferred_language: selectedGuest.preferred_language,
        rsvp_status: selectedGuest.rsvp_status,
        can_bring_plus_one: !!selectedGuest.can_bring_plus_one,
      } : null,
    });
  } catch (error) {
    logger.error('Failed to preview message:', error);
    return res.status(500).json({ success: false, error: 'Failed to preview message: ' + error.message });
  }
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
        // Check for missing email before sending
        if (!guest.email) {
          logger.warn('⚠️ Guest missing email, skipping:', guest.id);
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

            logger.debug('✅ Resend response:', {
              status: response.status,
              data: response.data,
            });

            // Format sentAt for MySQL DATETIME (YYYY-MM-DD HH:mm:ss)
            const sentAt = DateTime.utc().toFormat('yyyy-MM-dd HH:mm:ss');
            logger.debug('🧰 [messages.js] Resend formatted sentAt:', sentAt);

            const logSql = `UPDATE message_recipients
              SET delivery_status = 'sent', sent_at = ?, status = 'sent', error_message = NULL
              WHERE message_id = ? AND guest_id = ?`;
            await dbRun(logSql, [sentAt, messageId, guest.id]);
            results.push({ guest_id: guest.id, status: 'sent' });
            break;
          } catch (err) {
            if (err.response?.status === 429 && retries < maxRetries) {
              retries++;
              await delay(backoff[retries]);
            } else {
              const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
              logger.error('❌ Resend error:', errorMsg);
              const logSql = `UPDATE message_recipients
                SET delivery_status = 'failed', error_message = ?
                WHERE message_id = ? AND guest_id = ?`;
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

/**
 * @openapi
 * /messages/preview-template/:templateId:
 *   post:
 *     summary: Preview a message template with guest substitutions
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: templateId
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
 *               - guestId
 *             properties:
 *               guestId:
 *                 type: integer
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
 *                 variables:
 *                   type: object
 *                 lang:
 *                   type: string
 */
// Preview a message with guest substitutions
router.post('/preview-template/:templateId', async (req, res) => {
  const templateId = req.params.templateId;
  const guestId = req.body.guestId;

  try {
    // Get template
    const template = await dbGet('SELECT * FROM templates WHERE id = ?', [templateId]);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    // Get guest
    const guest = await dbGet('SELECT * FROM guests WHERE id = ?', [guestId]);
    if (!guest) {
      return res.status(404).json({ success: false, error: 'Guest not found' });
    }

    // Get enhanced variables
    const variables = await getTemplateVariables(guest, template);
    const lang = guest.preferred_language === 'lt' ? 'lt' : 'en';

    // Replace variables in template
    const body_en = replaceTemplateVars(template.body_en, variables);
    const body_lt = replaceTemplateVars(template.body_lt, variables);
    const subject = replaceTemplateVars(template.subject, variables);

    const body = lang === 'lt' ? body_lt : body_en;

    return res.json({
      success: true,
      subject,
      body,
      variables,
    });
  } catch (err) {
    logger.error('Error previewing template:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /messages/template-variables:
 *   get:
 *     summary: Get available template variables
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: Available template variables
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 variables:
 *                   type: object
 */
router.get('/template-variables', async (req, res) => {
  try {
    const { getAvailableVariables } = require('../utils/templateVariables');
    const variables = getAvailableVariables();
    
    return res.json({ 
      success: true, 
      variables,
      conditionalExamples: {
        "{{#if can_bring_plus_one}}...{{/if}}": "Show content only if guest can bring plus one",
        "{{#if plus_one_name}}...{{else}}...{{/if}}": "Show different content based on plus one status",
        "{{#if rsvp_status === 'attending'}}...{{else}}...{{/if}}": "Show content based on RSVP status",
        "{{#if group_label === 'Bride\\'s Family'}}...{{/if}}": "Show content for specific groups"
      }
    });
  } catch (err) {
    logger.error('Error getting template variables:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
