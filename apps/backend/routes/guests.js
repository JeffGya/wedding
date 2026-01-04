const express = require('express');
const getDbConnection = require('../db/connection');
const db = getDbConnection();
const Guest = require('../db/models/guest');
const requireAuth = require('../middleware/auth');
const axios = require('axios');
const getSenderInfo = require('../helpers/getSenderInfo');
const { sendConfirmationEmail } = require('../helpers/sendConfirmationEmail');
const { sendBadRequest, sendNotFound, sendInternalError, sendForbidden } = require('../utils/errorHandler');
const { validateRsvpInput, validateRsvpBusinessRules } = require('../helpers/rsvpValidation');
const { getGuestAnalytics } = require('../helpers/guestAnalytics');

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

    const filters = {};
    if (attending !== undefined) filters.attending = attending;
    if (group_id !== undefined) filters.group_id = group_id;
    if (rsvp_status !== undefined) filters.rsvp_status = rsvp_status;

    const options = {
      sort_by: sort_by,
      page: parseInt(page),
      per_page: parseInt(per_page)
    };

    const result = await Guest.list(filters, options);
    res.json(result);
  } catch (err) {
    logger.error('[GUESTS_ROUTE] Error fetching guests:', err);
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
    const guest = await Guest.findById(id, { formatDates: 'iso' });
    if (!guest) return sendNotFound(res, 'Guest', req.params.id);
    res.json(guest);
  } catch (err) {
    logger.error('[GUESTS_ROUTE] Error fetching guest:', err);
    return sendInternalError(res, err, 'GET /guests/:id');
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
  try {
    const {
      group_id,
      group_label,
      name,
      email,
      code,
      can_bring_plus_one,
      is_primary
    } = req.body;

    // Validation
    const validation = Guest.validateGuestData(req.body, {
      requireCode: true,
      requireName: true,
      requireGroupLabel: true
    });

    if (!validation.isValid) {
      return sendBadRequest(res, validation.errors[0]);
    }

    // Boolean validation for can_bring_plus_one
    if (typeof can_bring_plus_one !== 'undefined' &&
        can_bring_plus_one !== 0 && can_bring_plus_one !== 1 && typeof can_bring_plus_one !== 'boolean') {
      return sendBadRequest(res, 'can_bring_plus_one must be a boolean or 0/1');
    }

    const result = await Guest.create({
      group_id,
      group_label,
      name,
      email,
      code,
      can_bring_plus_one: can_bring_plus_one || 0,
      is_primary: typeof is_primary !== 'undefined' ? is_primary : 1
    });

    res.status(201).json({ id: result.id });
  } catch (err) {
    logger.error('[GUESTS_ROUTE] Error creating guest:', err);
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
  try {
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

    // Validation
    if (!group_label) return sendBadRequest(res, 'group_label is required');
    if (!name) return sendBadRequest(res, 'name is required');
    if (!code) return sendBadRequest(res, 'code is required');

    const validation = Guest.validateGuestData(req.body);
    if (!validation.isValid) {
      return sendBadRequest(res, validation.errors[0]);
    }

    // Check if guest exists
    const existing = await Guest.findById(id);
    if (!existing) return sendNotFound(res, 'Guest', req.params.id);

    // Handle RSVP status conversion if attending is provided
    let rsvp_status = existing.rsvp_status;
    if (typeof attending !== 'undefined') {
      const { convertAttendingToRsvpStatus } = require('../helpers/rsvpStatus');
      rsvp_status = convertAttendingToRsvpStatus(attending, existing.rsvp_status, true);
      // Clear dietary and notes when not attending
      if (attending === false) {
        dietary = null;
        notes = null;
      }
    }

    await Guest.update(id, {
      name,
      email,
      group_label,
      can_bring_plus_one: can_bring_plus_one !== undefined ? (can_bring_plus_one ? 1 : 0) : undefined,
      is_primary: typeof is_primary !== 'undefined' ? is_primary : existing.is_primary,
      attending: typeof attending !== 'undefined' ? attending : undefined,
      rsvp_status,
      dietary,
      notes,
      rsvp_deadline,
      code,
      preferred_language: preferred_language || existing.preferred_language
    });

    res.json({ success: true });
  } catch (err) {
    logger.error('[GUESTS_ROUTE] Error updating guest:', err);
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
  try {
    const { id } = req.params;
    await Guest.delete(id);
    res.json({ success: true });
  } catch (err) {
    logger.error('[GUESTS_ROUTE] Error deleting guest:', err);
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
  try {
    const { id, attending, dietary, notes, rsvp_deadline, plus_one_name, plus_one_dietary, send_email } = req.body;
    
    if (!id) {
      return sendBadRequest(res, 'Missing required field: id');
    }
    
    // Input validation (attending is optional for admin)
    const inputValidation = validateRsvpInput(req.body, { requireCode: false, requireAttending: false });
    if (!inputValidation.isValid) {
      return sendBadRequest(res, inputValidation.errors[0]);
    }
    
    const guest = await Guest.findById(id);
    if (!guest) return sendNotFound(res, 'Guest', id);
    
    // Business rules validation
    const businessValidation = validateRsvpBusinessRules(guest, req.body);
    if (!businessValidation.isValid) {
      // Check if deadline error (403) or other (400)
      if (businessValidation.errors[0].includes('deadline')) {
        return sendForbidden(res, businessValidation.errors[0]);
      }
      return sendBadRequest(res, businessValidation.errors[0]);
    }
    
    // Update RSVP
    await Guest.updateRsvp(id, {
      attending,
      dietary,
      notes,
      rsvp_deadline
    });
    
    // Handle plus one logic (create, update, or delete)
    await Guest.handlePlusOne(guest, plus_one_name || null, plus_one_dietary || null);
    
    // Get updated guest to check RSVP status
    const updatedGuest = await Guest.findById(id);
    
    // Sync plus-one attending status if primary is attending
    if (updatedGuest.rsvp_status === 'attending') {
      await Guest.syncPlusOneAttendingStatus(guest.group_id, true);
    }
    
    res.json({ success: true });
    
    // Send confirmation email only if send_email flag is true
    if (send_email === true) {
      try {
        await sendConfirmationEmail(db, {
          ...guest,
          rsvp_status: updatedGuest.rsvp_status,
          preferred_language: guest.preferred_language,
          name: guest.name,
          group_label: guest.group_label,
          email: guest.email,
          code: guest.code
        });
      } catch (emailErr) {
        logger.error('[GUESTS_ROUTE] Error sending confirmation email:', emailErr);
        // Don't fail the request if email fails
      }
    }
  } catch (err) {
    logger.error('[GUESTS_ROUTE] Error updating RSVP:', err);
    return sendInternalError(res, err, 'POST /guests/rsvp');
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
  try {
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

    const guest = await Guest.findById(id);
    if (!guest) return sendNotFound(res, 'Guest', req.params.id);

    // Business rules validation
    const businessValidation = validateRsvpBusinessRules(guest, req.body);
    if (!businessValidation.isValid) {
      // Check if deadline error (403) or other (400)
      if (businessValidation.errors[0].includes('deadline')) {
        return sendForbidden(res, businessValidation.errors[0]);
      }
      return sendBadRequest(res, businessValidation.errors[0]);
    }

    // Update RSVP
    await Guest.updateRsvp(id, {
      attending,
      dietary,
      notes,
      rsvp_deadline
    });

    // Handle plus one logic (create, update, or delete)
    await Guest.handlePlusOne(guest, plus_one_name || null, plus_one_dietary || null);

    // Get updated guest to check RSVP status
    const updatedGuest = await Guest.findById(id);

    // Sync plus-one attending status if primary is attending
    if (updatedGuest.rsvp_status === 'attending') {
      await Guest.syncPlusOneAttendingStatus(guest.group_id, true);
    }

    res.json({ success: true });
    
    // Send confirmation email only if send_email flag is true
    if (send_email === true) {
      try {
        await sendConfirmationEmail(db, {
          ...guest,
          rsvp_status: updatedGuest.rsvp_status,
          preferred_language: guest.preferred_language,
          name: guest.name,
          group_label: guest.group_label,
          email: guest.email,
          code: guest.code
        });
      } catch (emailErr) {
        logger.error('[GUESTS_ROUTE] Error sending confirmation email:', emailErr);
        // Don't fail the request if email fails
      }
    }
  } catch (err) {
    logger.error('[GUESTS_ROUTE] Error updating RSVP:', err);
    return sendInternalError(res, err, 'PUT /guests/:id/rsvp');
  }
});

module.exports = router;