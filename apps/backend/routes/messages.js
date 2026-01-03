const express = require('express');
const router = express.Router();
const getDbConnection = require('../db/connection');
const { createDbHelpers } = require('../db/queryHelpers');
const db = getDbConnection();
const { dbGet, dbAll, dbRun } = createDbHelpers(db);
const requireAuth = require('../middleware/auth');
const { sendBatchEmails } = require('../helpers/emailService');
const { sendBadRequest, sendNotFound, sendInternalError } = require('../utils/errorHandler');
const SITE_URL = process.env.SITE_URL || 'http://localhost:5001';

// Helper function to detect template schema version (shared with templates.js logic)
let schemaVersionCache = null;
async function detectTemplateSchema() {
  if (schemaVersionCache !== null) return schemaVersionCache;
  
  try {
    // Try to fetch a template and check which columns exist
    const testTemplate = await dbGet('SELECT * FROM templates LIMIT 1', []);
    
    if (testTemplate) {
      const hasSubjectEn = 'subject_en' in testTemplate;
      schemaVersionCache = hasSubjectEn ? 'new' : 'old';
      return schemaVersionCache;
    } else {
      // No templates exist, check schema directly
      let checkSql;
      if (process.env.DB_TYPE === 'mysql') {
        checkSql = `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'templates' AND COLUMN_NAME = 'subject_en'`;
      } else {
        checkSql = `SELECT COUNT(*) as count FROM pragma_table_info('templates') WHERE name = 'subject_en'`;
      }
      
      const result = await dbGet(checkSql, []);
      const hasSubjectEn = (result?.count || 0) > 0;
      
      schemaVersionCache = hasSubjectEn ? 'new' : 'old';
      return schemaVersionCache;
    }
  } catch (error) {
    // Default to old schema if detection fails
    schemaVersionCache = 'old';
    return schemaVersionCache;
  }
}
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
    return sendBadRequest(res, 'Subject, body_en, body_lt, and status are required.');
  }
  // Special validation for scheduled messages
  let scheduledForFinal = null;
  if (status === 'scheduled') {
    logger.debug('🧰 [messages.js] Status is scheduled; scheduledAt:', scheduledAt);
    if (!scheduledAt) {
      return sendBadRequest(res, 'Scheduled time is required for scheduled messages.');
    }
    // Parse local Amsterdam time and convert to UTC
    let dt = DateTime.fromISO(scheduledAt, { zone: 'Europe/Amsterdam' });
    if (!dt.isValid) {
      return sendBadRequest(res, 'Scheduled time must be a valid datetime.');
    }
    if (dt < DateTime.utc()) {
      return sendBadRequest(res, 'Scheduled time must be in the future.');
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
    return sendInternalError(res, err, 'POST /messages');
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
    return sendInternalError(res, err, 'GET /messages');
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
  const { name, subject, subject_en, subject_lt, body_en, body_lt } = req.body;
  
  // Support both 'subject' (backward compatibility) and 'subject_en'/'subject_lt'
  const finalSubjectEn = subject_en || subject || '';
  const finalSubjectLt = subject_lt || subject || '';
  
  if (!name || !finalSubjectEn || !body_en || !body_lt) {
    return sendBadRequest(res, 'Name, subject (or subject_en), body_en, and body_lt are required.');
  }
  
  try {
    // Detect schema version
    const schemaVersion = await detectTemplateSchema();
    
    let sql, params;
    if (schemaVersion === 'new') {
      // New schema: separate subject_en and subject_lt columns
      sql = `INSERT INTO templates (name, subject_en, subject_lt, body_en, body_lt) VALUES (?, ?, ?, ?, ?)`;
      params = [name, finalSubjectEn, finalSubjectLt, body_en, body_lt];
    } else {
      // Old schema: single subject column with JSON
      const subjectJson = JSON.stringify({ en: finalSubjectEn, lt: finalSubjectLt });
      sql = `INSERT INTO templates (name, subject, body_en, body_lt) VALUES (?, ?, ?, ?)`;
      params = [name, subjectJson, body_en, body_lt];
    }
    
    const insertResult = await dbRun(sql, params);
    const id = insertResult.insertId || insertResult.lastID;
    res.json({ success: true, id });
  } catch (err) {
    return sendInternalError(res, err, 'GET /messages');
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
    return sendInternalError(res, err, 'GET /messages');
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
    if (!row) return sendNotFound(res, 'Template', req.params.id);
    res.json({ success: true, template: row });
  } catch (err) {
    return sendInternalError(res, err, 'GET /messages');
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
  const { name, subject, subject_en, subject_lt, body_en, body_lt } = req.body;
  
  // Support both 'subject' (backward compatibility) and 'subject_en'/'subject_lt'
  const finalSubjectEn = subject_en || subject || '';
  const finalSubjectLt = subject_lt || subject || '';
  
  if (!name || !finalSubjectEn || !body_en || !body_lt) {
    return sendBadRequest(res, 'Name, subject (or subject_en), body_en, and body_lt are required.');
  }
  
  try {
    // Detect schema version
    const schemaVersion = await detectTemplateSchema();
    
    let sql, params;
    if (schemaVersion === 'new') {
      // New schema: separate subject_en and subject_lt columns
      sql = `UPDATE templates SET name = ?, subject_en = ?, subject_lt = ?, body_en = ?, body_lt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      params = [name, finalSubjectEn, finalSubjectLt, body_en, body_lt, req.params.id];
    } else {
      // Old schema: single subject column with JSON
      const subjectJson = JSON.stringify({ en: finalSubjectEn, lt: finalSubjectLt });
      sql = `UPDATE templates SET name = ?, subject = ?, body_en = ?, body_lt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      params = [name, subjectJson, body_en, body_lt, req.params.id];
    }
    
    const result = await dbRun(sql, params);
    
    if ((result.affectedRows !== undefined && result.affectedRows === 0) ||
        (result.changes !== undefined && result.changes === 0)) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true });
  } catch (err) {
    return sendInternalError(res, err, 'GET /messages');
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
    if (!row) return sendNotFound(res, 'Message', req.params.id);
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
    return sendInternalError(res, err, 'GET /messages');
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
    return sendBadRequest(res, 'subject, body_en, and body_lt are required');
  }
  try {
    // First, check if message exists and is a draft
    const row = await dbGet(`SELECT * FROM messages WHERE id = ?`, [req.params.id]);
    if (!row) return sendNotFound(res, 'Message', req.params.id);
    if (row.status === 'sent') {
      return sendBadRequest(res, 'Sent messages cannot be updated');
    }
    // Validate status change
    const newStatus = status === 'scheduled' ? 'scheduled' : 'draft';
    let scheduled_for = null;
    if (newStatus === 'scheduled') {
      if (!scheduledAt) {
        return sendBadRequest(res, 'Scheduled time is required for scheduled messages');
      }
      // Parse local Amsterdam time and convert to UTC
      let dt = DateTime.fromISO(scheduledAt, { zone: 'Europe/Amsterdam' });
      if (!dt.isValid) {
        return sendBadRequest(res, 'Scheduled time must be a valid datetime.');
      }
      if (dt < DateTime.utc()) {
        return sendBadRequest(res, 'Scheduled time must be in the future.');
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
    if (Array.isArray(recipients) && recipients.length > 0) {
      await dbRun(`DELETE FROM message_recipients WHERE message_id = ?`, [req.params.id]);
      // Fetch guest details to get email and language
      const guestSql = `SELECT id, email, preferred_language FROM guests WHERE id IN (${recipients.map(() => '?').join(',')})`;
      const guests = await dbAll(guestSql, recipients);
      const insertSql = `INSERT INTO message_recipients (message_id, guest_id, email, language, delivery_status) VALUES (?, ?, ?, ?, 'pending')`;
      for (const guest of guests) {
        try {
          await dbRun(insertSql, [req.params.id, guest.id, guest.email, guest.preferred_language || 'en']);
        } catch (err) {
          logger.error('❌ Failed to insert recipient:', guest.id, err.message);
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
    return sendInternalError(res, err, 'GET /messages');
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
    if (!row) return sendNotFound(res, 'Message', req.params.id);
    if (row.status === 'sent') {
      return sendBadRequest(res, 'Sent messages cannot be deleted');
    }
    await dbRun('DELETE FROM message_recipients WHERE message_id = ?', [req.params.id]);
    await dbRun(`DELETE FROM messages WHERE id = ? AND status IN ('draft','scheduled')`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    return sendInternalError(res, err, 'GET /messages');
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
  logger.debug('[MESSAGES] Preparing to send message', {
    messageId,
    hasGuestIds: !!(guestIds && guestIds.length),
    guestIdsCount: guestIds ? guestIds.length : 0
  });
  try {
    // Load the message
    const message = await dbGet(`SELECT * FROM messages WHERE id = ?`, [messageId]);
    if (!message) {
      logger.error('❌ No message found for ID:', messageId);
      return sendNotFound(res, 'Message', messageId);
    }
    logger.debug('📦 Loaded message:', message);
    if ((!message.body_en || message.body_en.trim() === '') && (!message.body_lt || message.body_lt.trim() === '')) {
      logger.error('❌ Cannot send email: message body is empty.');
      return sendBadRequest(res, 'Cannot send email: message body is empty.');
    }
    if (message.status !== 'draft') {
      return sendBadRequest(res, 'Only draft messages can be sent');
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
    
    logger.debug('[MESSAGES] Preparing batch send', { messageId, guestCount: guests.length });
    
    // Prepare email options for each guest
    const emailOptionsPromises = guests
      .filter(guest => {
        if (!guest.email) {
          logger.warn('[MESSAGES] Guest missing email, skipping', { guestId: guest.id });
          return false;
        }
        return true;
      })
      .map(async (guest) => {
        const lang = guest.preferred_language === 'lt' ? 'lt' : 'en';
        
        // Get enhanced variables for this guest
        const variables = await getTemplateVariables(guest, message);
        
        // Replace variables in message content
        const body_en = replaceTemplateVars(message.body_en, variables);
        const body_lt = replaceTemplateVars(message.body_lt, variables);
        const subject = replaceTemplateVars(message.subject, variables);
        
        // Prepare email template options from settings
        const templateOptions = {
          siteUrl: variables.websiteUrl || variables.siteUrl || SITE_URL,
          title: variables.brideName && variables.groomName 
            ? `${variables.brideName} & ${variables.groomName}`
            : undefined
        };
        
        // Apply shared email template system for consistent, inline-styled HTML
        const styleKey = message.style || 'elegant';
        const emailHtmlEn = generateEmailHTML(body_en, styleKey, templateOptions);
        const emailHtmlLt = generateEmailHTML(body_lt, styleKey, templateOptions);
        
        return {
          to: guest.email,
          subject: subject,
          html: lang === 'lt' ? emailHtmlLt : emailHtmlEn,
          guestId: guest.id,
          language: lang
        };
      });
    
    const emailOptions = await Promise.all(emailOptionsPromises);
    
    // Send batch emails using unified service
    const batchResult = await sendBatchEmails({
      emails: emailOptions,
      db,
      batchSize: 1,
      batchDelay: 2000,
      emailDelay: 300,
      getTrackingInfo: (emailOpts) => ({
        messageId,
        guestId: emailOpts.guestId
      })
    });
    
    const results = batchResult.results;
    const sentCount = batchResult.sentCount;
    const failedCount = batchResult.failedCount;
    
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
    return sendInternalError(res, err, 'GET /messages');
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
    return sendBadRequest(res, 'scheduled_for field is required');
  }
  const dt = DateTime.fromISO(scheduled_for, { zone: 'Europe/Amsterdam' });
  if (!dt.isValid) {
    return sendBadRequest(res, 'scheduled_for must be a valid datetime');
  }
  if (dt < DateTime.utc()) {
    return sendBadRequest(res, 'scheduled_for must be in the future');
  }
  try {
    // Format scheduled_for for MySQL DATETIME (YYYY-MM-DD HH:mm:ss)
    const formattedScheduled = dt.toUTC().toFormat('yyyy-MM-dd HH:mm:ss');
    await dbRun(`UPDATE messages SET scheduled_for = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [formattedScheduled, messageId]);
    res.json({ success: true, scheduled_for: formattedScheduled });
  } catch (err) {
    return sendInternalError(res, err, 'GET /messages');
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
    return sendInternalError(res, err, 'GET /messages');
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

    // Prepare email template options from settings
    const emailOptions = {
      buttonText: null,
      buttonUrl: null,
      siteUrl: variables.websiteUrl || variables.siteUrl || SITE_URL,
      title: variables.brideName && variables.groomName 
        ? `${variables.brideName} & ${variables.groomName}`
        : undefined
    };

    // Generate email HTML for both languages without action button
    const email_html_en = generateEmailHTML(body_en, style, emailOptions);
    const email_html_lt = generateEmailHTML(body_lt, style, emailOptions);

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
    return sendInternalError(res, error, 'GET /messages/:id/preview');
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
    const message = await dbGet(`SELECT * FROM messages WHERE id = ?`, [messageId]);
    if (!message) return sendNotFound(res, 'Message', messageId);
    // Load failed recipients only
    const guests = await dbAll(
      `SELECT g.* FROM message_recipients mr JOIN guests g ON g.id = mr.guest_id WHERE mr.message_id = ? AND mr.delivery_status = 'failed'`,
      [messageId]
    );
    
    
    // Prepare email options for each guest
    const emailOptionsPromises = guests
      .filter(guest => {
        if (!guest.email) {
          logger.warn('[MESSAGES] Guest missing email, skipping resend', { guestId: guest.id });
          return false;
        }
        return true;
      })
      .map(async (guest) => {
        const lang = guest.preferred_language === 'lt' ? 'lt' : 'en';
        
        // Get enhanced variables for this guest
        const variables = await getTemplateVariables(guest, message);
        
        // Replace variables in message content
        const body_en = replaceTemplateVars(message.body_en, variables);
        const body_lt = replaceTemplateVars(message.body_lt, variables);
        const subject = replaceTemplateVars(message.subject, variables);
        
        // Prepare email template options from settings
        const templateOptions = {
          siteUrl: variables.websiteUrl || variables.siteUrl || SITE_URL,
          title: variables.brideName && variables.groomName 
            ? `${variables.brideName} & ${variables.groomName}`
            : undefined
        };
        
        // Apply shared email template system for consistent, inline-styled HTML
        const styleKey = message.style || 'elegant';
        const emailHtml = generateEmailHTML(lang === 'lt' ? body_lt : body_en, styleKey, templateOptions);
        
        return {
          to: guest.email,
          subject: subject,
          html: emailHtml,
          guestId: guest.id,
          language: lang
        };
      });
    
    const emailOptions = await Promise.all(emailOptionsPromises);
    
    // Send batch emails using unified service with custom tracking for updates
    const batchResult = await sendBatchEmails({
      emails: emailOptions,
      db,
      batchSize: 1,
      batchDelay: 2000,
      emailDelay: 300,
      getTrackingInfo: (emailOpts) => ({
        messageId,
        guestId: emailOpts.guestId,
        onSuccess: async (result, db, msgId, gId) => {
          // Update existing record instead of inserting
          const { createDbHelpers } = require('../db/queryHelpers');
          const { dbRun } = createDbHelpers(db);
          const sentAt = DateTime.utc().toFormat('yyyy-MM-dd HH:mm:ss');
            await dbRun(
              `UPDATE message_recipients
               SET delivery_status = 'sent', sent_at = ?, status = 'sent', error_message = NULL, resend_message_id = ?
               WHERE message_id = ? AND guest_id = ?`,
              [sentAt, result.messageId, msgId, gId]
            );
        },
        onFailure: async (error, db, msgId, gId) => {
          // Update existing record with new error
          const { createDbHelpers } = require('../db/queryHelpers');
          const { dbRun } = createDbHelpers(db);
            await dbRun(
              `UPDATE message_recipients
               SET delivery_status = 'failed', error_message = ?
               WHERE message_id = ? AND guest_id = ?`,
              [error, msgId, gId]
            );
        }
      })
    });
    
    const results = batchResult.results;
    const sentCount = batchResult.sentCount;
    const failedCount = batchResult.failedCount;
    res.json({ success: true, results, sentCount, failedCount });
  } catch (err) {
    return sendInternalError(res, err, 'GET /messages');
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
      return sendNotFound(res, 'Template', req.params.templateId);
    }

    // Get guest
    const guest = await dbGet('SELECT * FROM guests WHERE id = ?', [guestId]);
    if (!guest) {
      return sendNotFound(res, 'Guest', req.params.guestId);
    }

    // Get enhanced variables
    const variables = await getTemplateVariables(guest, template);
    const lang = guest.preferred_language === 'lt' ? 'lt' : 'en';

    // Replace variables in template
    const body_en = replaceTemplateVars(template.body_en, variables);
    const body_lt = replaceTemplateVars(template.body_lt, variables);
    // Use language-specific subject, with fallback for backward compatibility
    const subjectTemplate = lang === 'lt' ? (template.subject_lt || template.subject || '') : (template.subject_en || template.subject || '');
    const subject = replaceTemplateVars(subjectTemplate, variables);

    const body = lang === 'lt' ? body_lt : body_en;

    return res.json({
      success: true,
      subject,
      body,
      variables,
    });
  } catch (err) {
    return sendInternalError(res, err, 'GET /messages/preview-template/:templateId/:guestId');
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
    return sendInternalError(res, err, 'GET /messages/preview-variables');
  }
});

module.exports = router;
