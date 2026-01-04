'use strict';

const express = require('express');
const { setGuestSession } = require('../middleware/guestSession');
const { createRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Rate limiter for RSVP lookup route (IP-based, configurable via env)
const WINDOW_MS = Number(process.env.RSVP_LOOKUP_WINDOW_MS) || 15 * 60 * 1000;
const MAX_REQ = Number(process.env.RSVP_LOOKUP_MAX) || 10;
const lookupRateLimit = createRateLimiter({
  windowMs: WINDOW_MS,
  max: MAX_REQ,
  keyGenerator: (req) => req.ip,
  errorCode: 'RATE_LIMITED',
  errorMessage: 'Too many requests. Try again later.'
});
// parse JSON bodies on this router
router.use(express.json());
const getDbConnection = require('../db/connection');
const { createDbHelpers } = require('../db/queryHelpers');
const db = getDbConnection();
const { dbGet, dbAll, dbRun } = createDbHelpers(db);

const axios = require('axios');
const logger = require('../helpers/logger');
const getSenderInfo = require('../helpers/getSenderInfo');

const { generateEmailHTML, generateButtonHTML, getAvailableStyles } = require('../utils/emailTemplates');
const { getTemplateVariables, replaceTemplateVars } = require('../utils/templateVariables');
const { sendConfirmationEmail } = require('../helpers/sendConfirmationEmail');
const { convertAttendingToRsvpStatus } = require('../helpers/rsvpStatus');
const { handlePlusOne, syncPlusOneAttendingStatus } = require('../helpers/plusOneService');
const { sendBadRequest, sendNotFound, sendInternalError, sendForbidden } = require('../utils/errorHandler');
const { validateRsvpInput, validateRsvpBusinessRules } = require('../helpers/rsvpValidation');
const { formatDateWithTime } = require('../utils/dateFormatter');

// Replace the old getInlineStyles function with new template system
function applyEmailTemplate(content, style = 'elegant', options = {}) {
  return generateEmailHTML(content, style, options);
}

/**
 * @openapi
 * /api/rsvp/session:
 *   get:
 *     summary: Get current RSVP session information
 *     tags:
 *       - RSVP
 *     responses:
 *       '200':
 *         description: Authenticated guest session info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 auth:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     group_label:
 *                       type: string
 *                     rsvp_status:
 *                       type: string
 *       '401':
 *         description: Not authenticated
 */
 // GET /api/rsvp/session  -> return minimal auth info if cookie/session is valid
router.get('/session', (req, res) => {
  // req.guest should be populated by parseGuestSession mounted globally
  if (!req.guest) {
    return res.status(401).json({
      error: { message: 'Not authenticated' },
      message: 'Not authenticated'
    });
  }

  const auth = {
    name: req.guest.name,
    group_label: req.guest.group_label,
    rsvp_status: req.guest.rsvp_status,
    code: req.guest.code
  };
  return res.json({ auth });
});

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
router.get('/:code', lookupRateLimit, async (req, res) => {
  const { code } = req.params;
  if (!code) return sendBadRequest(res, 'Code is required');
  try {
    const rows = await dbAll(
      `SELECT id, group_label, name, email, code, is_primary, can_bring_plus_one, dietary, notes, attending, rsvp_status, rsvp_deadline 
       FROM guests WHERE code = ? OR (group_id = (SELECT group_id FROM guests WHERE code = ?) AND is_primary = 0)`,
      [code, code]
    );
    // Preserve original ISO deadline for countdown, and add formatted version
    rows.forEach(row => {
      if (row.rsvp_deadline) {
        row.rsvp_deadline_formatted = formatDateWithTime(row.rsvp_deadline);
        row.rsvp_deadline = new Date(row.rsvp_deadline).toISOString();
      }
    });
    if (!rows || rows.length === 0) return sendNotFound(res, 'Guest', code);
    const primaryGuest = rows.find(row => row.is_primary);
    const plusOne = rows.find(row => !row.is_primary);
    const guestData = {
      ...primaryGuest,
      plus_one_name: plusOne?.name || null,
      plus_one_dietary: plusOne?.dietary || null
    };
    // Establish guest session on lookup
    setGuestSession(res, primaryGuest.id, primaryGuest.code);
    const auth = {
      name: primaryGuest.name,
      group_label: primaryGuest.group_label,
      rsvp_status: primaryGuest.rsvp_status
    };
    return res.json({ success: true, guest: guestData, auth });
  } catch (err) {
    return sendInternalError(res, err, 'GET /rsvp/lookup');
  }
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
router.post('/', async (req, res) => {
  const { code, attending, plus_one_name, dietary, notes, plus_one_dietary, send_email } = req.body;
  
  // Input validation
  const inputValidation = validateRsvpInput(req.body, { requireCode: true, requireAttending: true });
  if (!inputValidation.isValid) {
    return sendBadRequest(res, inputValidation.errors[0]);
  }

  try {
    const row = await dbGet('SELECT * FROM guests WHERE code = ?', [code]);
    if (!row) {
      return sendNotFound(res, 'Guest', code);
    }

    // Business rules validation
    const businessValidation = validateRsvpBusinessRules(row, req.body);
    if (!businessValidation.isValid) {
      // Check if deadline error (403) or other (400)
      if (businessValidation.errors[0].includes('deadline')) {
        return sendForbidden(res, businessValidation.errors[0]);
      }
      return sendBadRequest(res, businessValidation.errors[0]);
    }

    // Determine attending and rsvp_status
    const attendingProvided = typeof attending !== 'undefined';
    const attendingValue = attendingProvided ? attending : row.attending;
    const rsvpStatusVal = convertAttendingToRsvpStatus(attendingValue, row.rsvp_status, attendingProvided);

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
      await dbRun('UPDATE guests SET group_id = ? WHERE id = ?', [row.id, row.id]);
      row.group_id = row.id;
    }

    // Clear dietary and notes when not attending
    // Preserve empty strings as empty strings (not null) when attending is true
    const finalDietary = attendingValue === false ? null : (dietary !== undefined && dietary !== null ? dietary : null);
    const finalNotes = attendingValue === false ? null : (notes !== undefined && notes !== null ? notes : null);
    await dbRun(`
      UPDATE guests SET
        attending = ?,
        rsvp_status = ?,
        dietary = ?,
        notes = ?,
        responded_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE code = ?
    `, [attendingValue, rsvpStatusVal, finalDietary, finalNotes, code]);

    // Handle plus one logic (create, update, or delete)
    await handlePlusOne(db, row, plus_one_name || null, plus_one_dietary || null);

    // Sync plus-one attending status if primary is attending
    if (attendingValue === true) {
      await syncPlusOneAttendingStatus(db, row.group_id, true);
    }

    // Prepare guest data for email with updated RSVP status
    const guestDataForEmail = {
      ...row,
      rsvp_status: rsvpStatusVal,
      attending: attendingValue,
      dietary: dietary || row.dietary || null,
      notes: notes || row.notes || null,
      plus_one_name: plus_one_name || null
    };

    // Send email only if send_email is not explicitly false
    // Default to true for public users (backward compatibility), but respect false from admin
    // Handle both boolean false and string "false" for robustness
    const shouldSendEmail = send_email !== false && send_email !== 'false' && send_email !== 0;
    logger.info(`RSVP email decision: send_email=${send_email} (type: ${typeof send_email}), shouldSendEmail=${shouldSendEmail}, code=${code}`);
    if (shouldSendEmail) {
      try {
        await sendConfirmationEmail(db, guestDataForEmail);
      } catch (emailErr) {
        logger.error('Error in sendConfirmationEmail', emailErr);
        // Don't fail the whole request if email fails, just log it
      }
    }
    
    // Then send response
    res.json({ success: true });
  } catch (err) {
    logger.error('Error in POST /rsvp handler', err);
    // Only send error response if headers haven't been sent
    if (!res.headersSent) {
      return sendInternalError(res, err, 'POST /rsvp');
    }
  }
});

/**
 * @openapi
 * /rsvp/template-styles:
 *   get:
 *     summary: Get available email template styles
 *     tags:
 *       - RSVP
 *     responses:
 *       '200':
 *         description: List of available email template styles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   key:
 *                     type: string
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *       '500':
 *         description: Failed to get template styles
 */
router.get('/template-styles', (req, res) => {
  try {
    const styles = getAvailableStyles();
    res.json({ success: true, styles });
  } catch (error) {
    logger.error('Error getting template styles:', error);
    return sendInternalError(res, error, 'GET /rsvp/template-styles');
  }
});

module.exports = router;