const express = require('express');
const getDbConnection = require('../db/connection');
const { createDbHelpers } = require('../db/queryHelpers');
const db = getDbConnection();
const { dbGet, dbAll, dbRun } = createDbHelpers(db);
const requireAuth = require('../middleware/auth');
const axios = require('axios');
const getSenderInfo = require('../helpers/getSenderInfo');
const { sendConfirmationEmail } = require('../helpers/sendConfirmationEmail');
const { convertAttendingToRsvpStatus } = require('../helpers/rsvpStatus');
const { handlePlusOne, syncPlusOneAttendingStatus } = require('../helpers/plusOneService');
const { sendBadRequest, sendNotFound, sendInternalError, sendForbidden } = require('../utils/errorHandler');
const { validateRsvpInput, validateRsvpBusinessRules } = require('../helpers/rsvpValidation');
const { getGuestAnalytics } = require('../helpers/guestAnalytics');
const { formatDateWithTime } = require('../utils/dateFormatter');

const logger = require('../helpers/logger');

const router = express.Router();

// Middleware: Protect all guest routes
router.use(requireAuth);

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
router.get('/', async (req, res) => {
  try {
    const { attending, group_id, rsvp_status, sort_by, page = 1, per_page = 40 } = req.query;

    let query = `
      SELECT
        id, group_id, group_label, name, preferred_language, email, code,
        can_bring_plus_one, is_primary, attending,
        rsvp_status, dietary, notes, rsvp_deadline, updated_at
      FROM guests
    `;

    const queryParams = [];
    const whereClauses = [];

    if (attending !== undefined) {
      whereClauses.push(`attending = ?`);
      queryParams.push(attending === 'true' ? 1 : 0);
    }
    if (group_id !== undefined) {
      whereClauses.push(`group_id = ?`);
      queryParams.push(group_id);
    }
    if (rsvp_status !== undefined) {
      whereClauses.push(`rsvp_status = ?`);
      queryParams.push(rsvp_status);
    }
    if (whereClauses.length > 0) {
      query += ' WHERE ' + whereClauses.join(' AND ');
    }

    if (sort_by === 'name') {
      query += ` ORDER BY name ASC`;
    } else if (sort_by === 'updated_at') {
      query += ` ORDER BY updated_at DESC`;
    } else {
      query += ` ORDER BY group_id ASC, id ASC`;
    }

    const limit = parseInt(per_page);
    const offset = (parseInt(page) - 1) * limit;
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    // Use dbAll for async/await
    const rows = await dbAll(query, queryParams);
    // Convert date fields to human-readable strings
    rows.forEach(row => {
      if (row.rsvp_deadline) {
        row.rsvp_deadline = formatDateWithTime(row.rsvp_deadline);
      }
      if (row.updated_at) {
        row.updated_at = formatDateWithTime(row.updated_at);
      }
    });
    res.json({ guests: rows, total: rows.length });
  } catch (err) {
    logger.error('Error fetching guests:', err);
    return sendInternalError(res, err, 'GET /guests');
  }
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
 *                   properties:
 *                     total:
 *                       type: integer
 *                     attending:
 *                       type: integer
 *                     not_attending:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                 dietary:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 *                 no_shows:
 *                   type: integer
 *                 late_responses:
 *                   type: integer
 *                 avg_response_time_days:
 *                   type: number
 */
router.get('/analytics', async (req, res) => {
  try {
    const analytics = await getGuestAnalytics(db);
    
    res.json({
      success: true,
      ...analytics
    });
  } catch (err) {
    logger.error('Error fetching RSVP analytics:', err);
    return sendInternalError(res, err, 'GET /guests/analytics');
  }
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
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await dbGet('SELECT * FROM guests WHERE id = ?', [id]);
    if (!row) return sendNotFound(res, 'Guest', req.params.id);
    if (row.rsvp_deadline) {
      row.rsvp_deadline = new Date(row.rsvp_deadline).toISOString();
    }
    if (row.updated_at) {
      row.updated_at = new Date(row.updated_at).toISOString();
    }
    res.json(row);
  } catch (err) {
    return sendInternalError(res, err, 'GET /guests');
  }
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
router.post('/', async (req, res) => {
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
    return sendBadRequest(res, 'Invalid email format');
  }
  // Boolean validation for can_bring_plus_one
  if (typeof can_bring_plus_one !== 'undefined' &&
      can_bring_plus_one !== 0 && can_bring_plus_one !== 1 && typeof can_bring_plus_one !== 'boolean') {
    return sendBadRequest(res, 'can_bring_plus_one must be a boolean or 0/1');
  }
  try {
    const result = await dbRun(
      `INSERT INTO guests (
        group_id, group_label, name, email, code,
        can_bring_plus_one, is_primary
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        group_id,
        group_label,
        name,
        email,
        code,
        can_bring_plus_one || 0,
        typeof is_primary !== 'undefined' ? is_primary : 1
      ]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    return sendInternalError(res, err, 'POST /guests');
  }
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
router.put('/:id', async (req, res) => {
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
    rsvp_deadline,
    code,
    preferred_language
  } = req.body;

  // Basic validation
  if (!group_label) return sendBadRequest(res, 'group_label is required');
  if (!name) return sendBadRequest(res, 'name is required');
  if (!code) return sendBadRequest(res, 'code is required');
  if (preferred_language && !['en', 'lt'].includes(preferred_language)) {
    return sendBadRequest(res, 'preferred_language must be either "en" or "lt"');
  }
  // Email format validation
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return sendBadRequest(res, 'Invalid email format');
  }
  // Boolean validation for can_bring_plus_one
  if (typeof can_bring_plus_one !== 'undefined' &&
      can_bring_plus_one !== 0 && can_bring_plus_one !== 1 && typeof can_bring_plus_one !== 'boolean') {
    return sendBadRequest(res, 'can_bring_plus_one must be a boolean or 0/1');
  }
  // RSVP deadline validation
  if (rsvp_deadline && isNaN(Date.parse(rsvp_deadline))) {
    return sendBadRequest(res, 'rsvp_deadline must be a valid datetime string');
  }

  try {
    const row = await dbGet('SELECT * FROM guests WHERE id = ?', [id]);
    if (!row) return sendNotFound(res, 'Guest', req.params.id);
    const isPrimaryValue = typeof is_primary !== 'undefined' ? is_primary : row.is_primary;
    const attendingValue = typeof attending !== 'undefined' ? attending : null;
    const rsvpStatusVal = convertAttendingToRsvpStatus(attendingValue, row.rsvp_status, typeof attending !== 'undefined');
    // Clear dietary and notes when not attending
    const finalDietary = attendingValue === false ? null : (dietary !== undefined ? dietary : row.dietary);
    const finalNotes = attendingValue === false ? null : (notes !== undefined ? notes : row.notes);
    await dbRun(
      `UPDATE guests SET
        name = ?, email = ?, group_label = ?,
        can_bring_plus_one = ?, is_primary = ?, attending = ?, rsvp_status = ?,
        dietary = ?, notes = ?, rsvp_deadline = ?, code = ?, preferred_language = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        name,
        email,
        group_label,
        can_bring_plus_one || 0,
        isPrimaryValue,
        attendingValue,
        rsvpStatusVal,
        finalDietary,
        finalNotes,
        rsvp_deadline || null,
        code,
        preferred_language || row.preferred_language,
        id
      ]
    );
    res.json({ success: true });
  } catch (err) {
    return sendInternalError(res, err, 'PUT /guests/:id');
  }
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
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Delete related message_recipients first to avoid foreign key constraint
    await dbRun('DELETE FROM message_recipients WHERE guest_id = ?', [id]);
    await dbRun('DELETE FROM guests WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    return sendInternalError(res, err, 'DELETE /guests/:id');
  }
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
router.post('/rsvp', async (req, res) => {
  const { id, attending, dietary, notes, rsvp_deadline, plus_one_name, plus_one_dietary, send_email } = req.body;
  
  if (!id) {
    return sendBadRequest(res, 'Missing required field: id');
  }
  
  // Input validation (attending is optional for admin)
  const inputValidation = validateRsvpInput(req.body, { requireCode: false, requireAttending: false });
  if (!inputValidation.isValid) {
    return sendBadRequest(res, inputValidation.errors[0]);
  }
  
  try {
    const row = await dbGet('SELECT * FROM guests WHERE id = ?', [id]);
    if (!row) return sendNotFound(res, 'Guest', req.params.id);
    
    // Business rules validation
    const businessValidation = validateRsvpBusinessRules(row, req.body);
    if (!businessValidation.isValid) {
      // Check if deadline error (403) or other (400)
      if (businessValidation.errors[0].includes('deadline')) {
        return sendForbidden(res, businessValidation.errors[0]);
      }
      return sendBadRequest(res, businessValidation.errors[0]);
    }
    
    const attendingProvided = typeof attending !== 'undefined';
    const attendingValue = attendingProvided ? attending : row.attending;
    const rsvpStatusVal = convertAttendingToRsvpStatus(attendingValue, row.rsvp_status, attendingProvided);
    // Clear dietary and notes when not attending
    const finalDietary = attendingValue === false ? null : (dietary || null);
    const finalNotes = attendingValue === false ? null : (notes || null);
    await dbRun(
      `UPDATE guests SET
        attending = ?, rsvp_status = ?, dietary = ?, notes = ?,
        rsvp_deadline = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        attendingValue,
        rsvpStatusVal,
        finalDietary,
        finalNotes,
        rsvp_deadline || row.rsvp_deadline,
        id
      ]
    );
    
    // Handle plus one logic (create, update, or delete)
    await handlePlusOne(db, row, plus_one_name || null, plus_one_dietary || null);
    
    // Sync plus-one attending status if primary is attending
    if (rsvpStatusVal === 'attending') {
      await syncPlusOneAttendingStatus(db, row.group_id, true);
    }
    res.json({ success: true });
    
    // Send confirmation email only if send_email flag is true
    if (send_email === true) {
      try {
        await sendConfirmationEmail(db, {
          ...row,
          rsvp_status: rsvpStatusVal,
          preferred_language: row.preferred_language,
          name: row.name,
          group_label: row.group_label,
          email: row.email,
          code: row.code
        });
      } catch (emailErr) {
        logger.error('Error sending confirmation email:', emailErr);
        // Don't fail the request if email fails
      }
    }
  } catch (err) {
    return sendInternalError(res, err, 'PUT /guests/:id/rsvp');
  }
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
 *             type: object
 *             properties:
 *               attending:
 *                 type: boolean
 *               dietary:
 *                 type: string
 *               notes:
 *                 type: string
 *               rsvp_deadline:
 *                 type: string
 *                 format: date-time
 *               plus_one_name:
 *                 type: string
 *               plus_one_dietary:
 *                 type: string
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

router.put('/:id/rsvp', async (req, res) => {
  const { id } = req.params;
  const { attending, dietary, notes, rsvp_deadline, plus_one_name, plus_one_dietary, send_email } = req.body;

  if (!id) {
    return sendBadRequest(res, 'Missing required field: id');
  }

  // Input validation (attending is optional for admin)
  const inputValidation = validateRsvpInput(req.body, { requireCode: false, requireAttending: false });
  if (!inputValidation.isValid) {
    return sendBadRequest(res, inputValidation.errors[0]);
  }

  try {
    const row = await dbGet('SELECT * FROM guests WHERE id = ?', [id]);
    if (!row) return sendNotFound(res, 'Guest', req.params.id);

    // Business rules validation
    const businessValidation = validateRsvpBusinessRules(row, req.body);
    if (!businessValidation.isValid) {
      // Check if deadline error (403) or other (400)
      if (businessValidation.errors[0].includes('deadline')) {
        return sendForbidden(res, businessValidation.errors[0]);
      }
      return sendBadRequest(res, businessValidation.errors[0]);
    }

    const attendingProvided = typeof attending !== 'undefined';
    const attendingValue = attendingProvided ? attending : row.attending;
    const rsvpStatusVal = convertAttendingToRsvpStatus(attendingValue, row.rsvp_status, attendingProvided);

    // Clear dietary and notes when not attending
    const finalDietary = attendingValue === false ? null : (dietary || null);
    const finalNotes = attendingValue === false ? null : (notes || null);
    await dbRun(
      `UPDATE guests SET
         attending = ?,
         rsvp_status = ?,
         dietary = ?,
         notes = ?,
         rsvp_deadline = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        attendingValue,
        rsvpStatusVal,
        finalDietary,
        finalNotes,
        rsvp_deadline || row.rsvp_deadline,
        id
      ]
    );

    // Handle plus one logic (create, update, or delete)
    await handlePlusOne(db, row, plus_one_name || null, plus_one_dietary || null);

    // Sync plus-one attending status if primary is attending
    if (rsvpStatusVal === 'attending') {
      await syncPlusOneAttendingStatus(db, row.group_id, true);
    }

    res.json({ success: true });
    
    // Send confirmation email only if send_email flag is true
    if (send_email === true) {
      try {
        await sendConfirmationEmail(db, {
          ...row,
          rsvp_status: rsvpStatusVal,
          preferred_language: row.preferred_language,
          name: row.name,
          group_label: row.group_label,
          email: row.email,
          code: row.code
        });
      } catch (emailErr) {
        logger.error('Error sending confirmation email:', emailErr);
        // Don't fail the request if email fails
      }
    }
  } catch (err) {
    return sendInternalError(res, err, 'PUT /guests/:id/rsvp');
  }
});

module.exports = router;