const express = require('express');
const router = express.Router();
const getDbConnection = require('../db/connection');
const { createDbHelpers } = require('../db/queryHelpers');
const db = getDbConnection();
const { dbGet, dbAll, dbRun } = createDbHelpers(db);
const Guest = require('../db/models/guest');
const requireAuth = require('../middleware/auth');
const { sendBatchEmails } = require('../helpers/emailService');
const { sendBadRequest, sendNotFound, sendInternalError } = require('../utils/errorHandler');
const { detectTemplateSchema } = require('../utils/templateSchema');
const SITE_URL = process.env.SITE_URL || 'http://localhost:5001';
// Use Luxon for robust timezone handling
const { DateTime } = require('luxon');
const logger = require('../helpers/logger');

// Use unified email generation service
const { generateEmailFromMessage } = require('../helpers/emailGeneration');
const { resolveTemplateSubject, normalizeTemplateSubjects, normalizeMessageSubjects } = require('../utils/subjectResolver');


// Use formatRsvpDeadline from dateFormatter utility instead
const { formatRsvpDeadline } = require('../utils/dateFormatter');

// Protect all routes
router.use(requireAuth);

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
  const { subject, subject_en, subject_lt, body_en, body_lt, status, scheduledAt, recipients, style = 'elegant' } = req.body;
  
  // Support both 'subject' (backward compatibility) and 'subject_en'/'subject_lt'
  const finalSubjectEn = subject_en || subject || '';
  const finalSubjectLt = subject_lt || subject || '';
  
  // Validate required fields
  if ((!finalSubjectEn && !finalSubjectLt) || !body_en || !body_lt || !status) {
    return sendBadRequest(res, 'Subject (or subject_en/subject_lt), body_en, body_lt, and status are required.');
  }
  // Special validation for scheduled messages
  let scheduledForFinal = null;
  if (status === 'scheduled') {
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
  }
  try {
    // Store both subjects as JSON in the subject column
    const subjectJson = JSON.stringify({ en: finalSubjectEn, lt: finalSubjectLt });
    
    const insertResult = await dbRun(
      `INSERT INTO messages (subject, body_en, body_lt, status, scheduled_for, style) VALUES (?, ?, ?, ?, ?, ?)`,
      [subjectJson, body_en, body_lt, status, scheduledForFinal, style]
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
          logger.error('Failed to insert recipient:', guest.id, e.message);
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
      // Normalize message subjects
      const normalized = normalizeMessageSubjects(row);
      
      if (normalized.scheduled_for) {
        let scheduledDate;
        if (normalized.scheduled_for instanceof Date) {
          scheduledDate = normalized.scheduled_for;
        } else {
          // Convert "YYYY-MM-DD HH:mm:ss" to ISO with Z
          scheduledDate = new Date(normalized.scheduled_for.replace(' ', 'T') + 'Z');
        }
        normalized.scheduled_for = scheduledDate.toISOString();
      }
      // created_at
      if (normalized.created_at instanceof Date) {
        normalized.created_at = normalized.created_at.toISOString();
      } else {
        normalized.created_at = new Date(normalized.created_at).toISOString();
      }
      // updated_at
      if (normalized.updated_at instanceof Date) {
        normalized.updated_at = normalized.updated_at.toISOString();
      } else {
        normalized.updated_at = new Date(normalized.updated_at).toISOString();
      }
      return normalized;
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
    const schemaVersion = await detectTemplateSchema(db);
    
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
    const schemaVersion = await detectTemplateSchema(db);
    
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
    
    // Normalize message subjects (handles both JSON and plain text)
    const normalizedMessage = normalizeMessageSubjects(row);
    
    if (normalizedMessage.scheduled_for) {
      const local = DateTime.fromISO(normalizedMessage.scheduled_for, { zone: 'utc' }).setZone('Europe/Amsterdam');
      normalizedMessage.scheduled_for = local.toISO({ suppressMilliseconds: true });
    }
    // Convert created_at and updated_at to ISO strings
    if (normalizedMessage.created_at) {
      normalizedMessage.created_at = new Date(normalizedMessage.created_at).toISOString();
    }
    if (normalizedMessage.updated_at) {
      normalizedMessage.updated_at = new Date(normalizedMessage.updated_at).toISOString();
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
    res.json({ success: true, message: { ...normalizedMessage, recipients: recipientIds, sentCount, failedCount } });
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
  const { subject, subject_en, subject_lt, body_en, body_lt, status, scheduledAt, recipients } = req.body;
  
  // Support both 'subject' (backward compatibility) and 'subject_en'/'subject_lt'
  const finalSubjectEn = subject_en || subject || '';
  const finalSubjectLt = subject_lt || subject || '';
  
  // Basic validation
  if ((!finalSubjectEn && !finalSubjectLt) || !body_en || !body_lt) {
    return sendBadRequest(res, 'Subject (or subject_en/subject_lt), body_en, and body_lt are required');
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
    // Store both subjects as JSON in the subject column
    const subjectJson = JSON.stringify({ en: finalSubjectEn, lt: finalSubjectLt });
    
    await dbRun(
      `UPDATE messages 
      SET subject = ?, body_en = ?, body_lt = ?, status = ?, scheduled_for = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?`,
      [subjectJson, body_en, body_lt, newStatus, scheduled_for, req.params.id]
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
    // Normalize message subjects
    const normalizedMessage = normalizeMessageSubjects(updatedRow);
    
    // Return recipients too
    const recips = await dbAll(`SELECT guest_id FROM message_recipients WHERE message_id = ?`, [req.params.id]);
    const recipientIds = recips.map(r => r.guest_id);
    res.json({ success: true, message: { ...normalizedMessage, recipients: recipientIds } });
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
  const messageId = req.params.id;
  const guestIds = req.body?.guestIds && Array.isArray(req.body.guestIds) && req.body.guestIds.length > 0
    ? req.body.guestIds
    : null;
  try {
    // Load the message
    const rawMessage = await dbGet(`SELECT * FROM messages WHERE id = ?`, [messageId]);
    if (!rawMessage) {
      return sendNotFound(res, 'Message', messageId);
    }
    
    // Normalize message subjects
    const message = normalizeMessageSubjects(rawMessage);
    
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
    
    // Prepare email options for each guest using unified service
    const emailOptionsPromises = guests
      .filter(guest => {
        if (!guest.email) {
          logger.warn('[MESSAGES] Guest missing email, skipping', { guestId: guest.id });
          return false;
        }
        return true;
      })
      .map(async (guest) => {
        try {
          // Use unified email generation service
          const emailData = await generateEmailFromMessage(message, guest, {
            style: message.style || 'elegant'
          });
          
          return emailData;
        } catch (error) {
          logger.error('[MESSAGES] Error preparing email for guest', { 
            guestId: guest.id,
            error: error.message,
            stack: error.stack
          });
          throw error;
        }
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
    
    // Support both new format (subject_en/subject_lt) and old format (subject)
    const subjectEn = template?.subject_en ?? req.body.subjectEn ?? req.body.subject_en ?? req.body.subject ?? '';
    const subjectLt = template?.subject_lt ?? req.body.subjectLt ?? req.body.subject_lt ?? req.body.subject ?? '';
    
    // Store as JSON for backward compatibility with email generation
    const subjectJson = JSON.stringify({ en: subjectEn, lt: subjectLt });
    
    const style = template?.style ?? req.body.style ?? 'elegant';
    const tpl = {
      subject: subjectJson, // Store as JSON for backward compatibility
      subject_en: subjectEn,
      subject_lt: subjectLt,
      body_en: template?.body_en ?? req.body.bodyEn ?? '',
      body_lt: template?.body_lt ?? req.body.bodyLt ?? '',
      style,
    };

    // Resolve selected guest and sample guests
    let selectedGuest = guest || null;
    if (!selectedGuest && guestId) {
      selectedGuest = await Guest.findById(guestId);
    }
    let sampleGuests = [];
    if (!selectedGuest) {
      sampleGuests = await dbAll(
        `SELECT id, name, email, group_label, preferred_language, rsvp_status, can_bring_plus_one, code,
                rsvp_deadline, attending, responded_at, dietary, notes
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

    // Use unified email generation service for both languages
    const emailDataEn = await generateEmailFromMessage(
      tpl,
      selectedGuest,
      { style, language: 'en' }
    );
    
    const emailDataLt = await generateEmailFromMessage(
      tpl,
      selectedGuest,
      { style, language: 'lt' }
    );

    // Get processed content for preview (body_en and body_lt) - needed for editing view
    const { getEmailContent } = require('../helpers/emailGeneration');
    const { getTemplateVariables, replaceTemplateVars } = require('../utils/templateVariables');
    // Generate variables for both languages
    const variablesEn = await getTemplateVariables(selectedGuest, tpl, 'en');
    const variablesLt = await getTemplateVariables(selectedGuest, tpl, 'lt');
    const { body: body_en } = await getEmailContent(tpl, selectedGuest, 'en');
    const { body: body_lt } = await getEmailContent(tpl, selectedGuest, 'lt');
    const processedBodyEn = replaceTemplateVars(body_en, variablesEn);
    const processedBodyLt = replaceTemplateVars(body_lt, variablesLt);
    const resolvedSubjectEn = emailDataEn.subject; // Use subject from generated email (English)
    const resolvedSubjectLt = emailDataLt.subject; // Use subject from generated email (Lithuanian)

    return res.json({
      success: true,
      subject: resolvedSubjectEn, // Keep for backward compatibility
      subject_en: resolvedSubjectEn,
      subject_lt: resolvedSubjectLt,
      body_en: processedBodyEn,
      body_lt: processedBodyLt,
      email_html_en: emailDataEn.html,
      email_html_lt: emailDataLt.html,
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
    const rawMessage = await dbGet(`SELECT * FROM messages WHERE id = ?`, [messageId]);
    if (!rawMessage) return sendNotFound(res, 'Message', messageId);
    
    // Normalize message subjects
    const message = normalizeMessageSubjects(rawMessage);
    
    // Load failed recipients only
    const guests = await dbAll(
      `SELECT g.* FROM message_recipients mr JOIN guests g ON g.id = mr.guest_id WHERE mr.message_id = ? AND mr.delivery_status = 'failed'`,
      [messageId]
    );
    
    
    // Prepare email options for each guest using unified service
    const emailOptionsPromises = guests
      .filter(guest => {
        if (!guest.email) {
          logger.warn('[MESSAGES] Guest missing email, skipping resend', { guestId: guest.id });
          return false;
        }
        return true;
      })
      .map(async (guest) => {
        try {
          // Use unified email generation service
          const emailData = await generateEmailFromMessage(message, guest, {
            style: message.style || 'elegant'
          });
          
          return emailData;
        } catch (error) {
          logger.error('[MESSAGES] Error preparing resend email for guest', { 
            guestId: guest.id,
            error: error.message,
            stack: error.stack
          });
          throw error;
        }
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
    const guest = await Guest.findById(guestId);
    if (!guest) {
      return sendNotFound(res, 'Guest', req.params.guestId);
    }

    // Get enhanced variables with language
    const lang = guest.preferred_language === 'lt' ? 'lt' : 'en';
    const variables = await getTemplateVariables(guest, template, lang);

    // Replace variables in template
    const body_en = replaceTemplateVars(template.body_en, variables);
    const body_lt = replaceTemplateVars(template.body_lt, variables);
    // Resolve subject with fallback logic
    const subjectTemplate = resolveTemplateSubject(template, lang, { context: 'message' });
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
