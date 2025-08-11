'use strict';

function formatDate(dateString) {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  return new Date(dateString).toLocaleString('en-US', options);
}

const express = require('express');
const { setGuestSession } = require('../middleware/guestSession');
const router = express.Router();
// Simple in-memory rate limiter (IP-based) for lookup route
const rateBuckets = new Map();
function rateLimit(windowMs = 15 * 60 * 1000, max = 10) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    let bucket = rateBuckets.get(key);
    if (!bucket || bucket.reset < now) {
      bucket = { count: 1, reset: now + windowMs };
      rateBuckets.set(key, bucket);
      return next();
    }
    if (bucket.count >= max) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }
    bucket.count++;
    next();
  };
}
// Allow overriding via env, but default to 15min / 10 req
const WINDOW_MS = Number(process.env.RSVP_LOOKUP_WINDOW_MS) || 15 * 60 * 1000;
const MAX_REQ = Number(process.env.RSVP_LOOKUP_MAX) || 10;
const lookupRateLimit = rateLimit(WINDOW_MS, MAX_REQ);
// parse JSON bodies on this router
router.use(express.json());
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

const axios = require('axios');
const logger = require('../helpers/logger');
const getSenderInfo = require('../helpers/getSenderInfo');

const { generateEmailHTML, generateButtonHTML, getAvailableStyles } = require('../utils/emailTemplates');

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
  if (!code) return res.status(400).json({ error: 'Code is required' });
  try {
    const rows = await dbAll(
      `SELECT id, group_label, name, email, code, is_primary, can_bring_plus_one, dietary, notes, attending, rsvp_status, rsvp_deadline 
       FROM guests WHERE code = ? OR (group_id = (SELECT group_id FROM guests WHERE code = ?) AND is_primary = 0)`,
      [code, code]
    );
    // Preserve original ISO deadline for countdown, and add formatted version
    rows.forEach(row => {
      if (row.rsvp_deadline) {
        row.rsvp_deadline_formatted = formatDate(row.rsvp_deadline);
        row.rsvp_deadline = new Date(row.rsvp_deadline).toISOString();
      }
    });
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Guest not found' });
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
    return res.status(500).json({ error: 'Database error' });
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
  logger.debug('req.body →', req.body);
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

  try {
    const row = await dbGet('SELECT * FROM guests WHERE code = ?', [code]);
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
      await dbRun('UPDATE guests SET group_id = ? WHERE id = ?', [row.id, row.id]);
      row.group_id = row.id;
    }

    const existingPlusOne = await dbGet(
      'SELECT * FROM guests WHERE group_id = ? AND is_primary = 0 LIMIT 1',
      [row.group_id]
    );

    await dbRun(`
      UPDATE guests SET
        attending = ?,
        rsvp_status = ?,
        dietary = ?,
        notes = ?,
        responded_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE code = ?
    `, [attendingValue, rsvpStatusVal, dietary || null, notes || null, code]);

    // Handle plus one logic
    if (existingPlusOne && (plus_one_name === null || plus_one_name === '')) {
      // Delete the plus one
      await dbRun('DELETE FROM guests WHERE id = ?', [existingPlusOne.id]);
    } else if (plus_one_name) {
      if (existingPlusOne) {
        // Update existing plus one
        await dbRun(
          `UPDATE guests SET name = ?, dietary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [plus_one_name, plus_one_dietary || null, existingPlusOne.id]
        );
      } else {
        // Insert new plus one
        await dbRun(
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
          ]
        );
      }
    }

    if (attendingValue === true) {
      await dbRun(
        `UPDATE guests
          SET attending = 1,
              rsvp_status = 'attending',
              updated_at = CURRENT_TIMESTAMP
          WHERE group_id = ? AND is_primary = 0`,
        [row.group_id]
      );
    }

    // Send email first (before response)
    await sendConfirmationEmail(db, row);
    
    // Then send response
    res.json({ success: true });
  } catch (err) {
    // Only send error response if headers haven't been sent
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Database error' });
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
    res.status(500).json({ success: false, error: 'Failed to get template styles' });
  }
});

module.exports = router;