const express = require('express');
const router = express.Router();
const getDbConnection = require('../db/connection');
const requireAuth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../helpers/logger');
const { sendValidationError, sendInternalError } = require('../utils/errorHandler');

// Initialize database connection and helper methods for SQLite or MySQL
const db = getDbConnection();
const { createDbHelpers } = require('../db/queryHelpers');
const { dbGet, dbRun } = createDbHelpers(db);

// Require authentication on all setting routes
// router.use(requireAuth);

/**
 * @openapi
 * /setting/email:
 *   get:
 *     summary: Retrieve the current email settings
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: The email settings object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailSettings'
 *       '500':
 *         description: Failed to fetch email settings
 */
// GET email settings
router.get('/email', requireAuth, async (req, res) => {
  try {
    const row = await dbGet('SELECT * FROM email_settings WHERE id = ?', [1]);
    res.json(row);
  } catch (err) {
    return sendInternalError(res, err, 'GET /setting/email');
  }
});

/**
 * @openapi
 * /setting/email:
 *   put:
 *     summary: Update email settings
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailSettingsUpdate'
 *     responses:
 *       '200':
 *         description: Email settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '500':
 *         description: Failed to update email settings
 */
// UPDATE email settings
router.put('/email', requireAuth, async (req, res) => {
  const { provider, api_key, from_name, from_email, sender_name, sender_email, enabled } = req.body;
  const sql = `
    UPDATE email_settings
    SET provider = ?, api_key = ?, from_name = ?, from_email = ?, sender_name = ?, sender_email = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `;
  const values = [provider, api_key, from_name, from_email, sender_name, sender_email, enabled ? 1 : 0];
  try {
    await dbRun(sql, values);
    res.json({ success: true });
  } catch (err) {
    return sendInternalError(res, err, 'PUT /setting/email');
  }
});

/**
 * @openapi
 * /setting:
 *   get:
 *     summary: Retrieve the main site settings
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: Main settings object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enableGlobalCountdown:
 *                   type: boolean
 *                 weddingDate:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *       '500':
 *         description: Failed to fetch main settings
 */
// GET main settings
router.get('/', async (req, res) => {
  try {
    const row = await dbGet(
      `SELECT 
        enable_global_countdown AS enableGlobalCountdown, 
        wedding_date AS weddingDate,
        venue_name,
        venue_address,
        event_start_date,
        event_end_date,
        event_time,
        bride_name,
        groom_name,
        contact_email,
        contact_phone,
        event_type,
        dress_code,
        special_instructions,
        website_url,
        app_title
      FROM settings WHERE id = 1`
    );

    let plainDate = null;
    if (row && row.weddingDate) {
      const d = new Date(row.weddingDate);
      d.setUTCHours(12, 0, 0, 0); // set to noon UTC to avoid timezone shifting
      plainDate = d.toISOString(); // keep full timestamp
    }

    return res.json({
      enableGlobalCountdown: row ? Boolean(row.enableGlobalCountdown) : false,
      weddingDate: plainDate,
      venueName: row?.venue_name || '',
      venueAddress: row?.venue_address || '',
      eventStartDate: row?.event_start_date || '',
      eventEndDate: row?.event_end_date || '',
      eventTime: row?.event_time || '',
      brideName: row?.bride_name || '',
      groomName: row?.groom_name || '',
      contactEmail: row?.contact_email || '',
      contactPhone: row?.contact_phone || '',
      eventType: row?.event_type || '',
      dressCode: row?.dress_code || '',
      specialInstructions: row?.special_instructions || '',
      websiteUrl: row?.website_url || '',
      appTitle: row?.app_title || ''
    });
  } catch (err) {
    return sendInternalError(res, err, 'GET /setting');
  }
});
router.use(requireAuth);

/**
 * @openapi
 * /setting:
 *   put:
 *     summary: Create or update the main site settings
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enable_global_countdown:
 *                 type: boolean
 *               wedding_date:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *     responses:
 *       '200':
 *         description: Main settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '400':
 *         description: Validation errors for input
 *       '500':
 *         description: Failed to update main settings
 */
// UPDATE main settings
router.put(
  '/',
  requireAuth,
  [
    body('enable_global_countdown')
      .isBoolean()
      .withMessage('enable_global_countdown must be a boolean'),
    body('wedding_date').custom((value, { req }) => {
      if (req.body.enable_global_countdown) {
        if (!value) throw new Error('wedding_date is required when enable_global_countdown is true');
        if (isNaN(Date.parse(value))) throw new Error('wedding_date must be a valid ISO 8601 date');
      }
      return true;
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors);
    }
    const { 
      enable_global_countdown, 
      wedding_date,
      venue_name,
      venue_address,
      event_start_date,
      event_end_date,
      event_time,
      bride_name,
      groom_name,
      contact_email,
      contact_phone,
      event_type,
      dress_code,
      special_instructions,
      website_url,
      app_title
    } = req.body;
    
    let sql;
    if (process.env.DB_TYPE === 'mysql') {
      sql = `
        INSERT INTO settings (
          id, enable_global_countdown, wedding_date, 
          venue_name, venue_address, event_start_date, event_end_date, event_time,
          bride_name, groom_name, contact_email, contact_phone,
          event_type, dress_code, special_instructions,
          website_url, app_title, created_at, updated_at
        )
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          enable_global_countdown = VALUES(enable_global_countdown),
          wedding_date = VALUES(wedding_date),
          venue_name = VALUES(venue_name),
          venue_address = VALUES(venue_address),
          event_start_date = VALUES(event_start_date),
          event_end_date = VALUES(event_end_date),
          event_time = VALUES(event_time),
          bride_name = VALUES(bride_name),
          groom_name = VALUES(groom_name),
          contact_email = VALUES(contact_email),
          contact_phone = VALUES(contact_phone),
          event_type = VALUES(event_type),
          dress_code = VALUES(dress_code),
          special_instructions = VALUES(special_instructions),
          website_url = VALUES(website_url),
          app_title = VALUES(app_title),
          updated_at = CURRENT_TIMESTAMP
      `;
    } else {
      sql = `
        INSERT INTO settings (
          id, enable_global_countdown, wedding_date, 
          venue_name, venue_address, event_start_date, event_end_date, event_time,
          bride_name, groom_name, contact_email, contact_phone,
          event_type, dress_code, special_instructions,
          website_url, app_title, created_at, updated_at
        )
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          enable_global_countdown = excluded.enable_global_countdown,
          wedding_date = excluded.wedding_date,
          venue_name = excluded.venue_name,
          venue_address = excluded.venue_address,
          event_start_date = excluded.event_start_date,
          event_end_date = excluded.event_end_date,
          event_time = excluded.event_time,
          bride_name = excluded.bride_name,
          groom_name = excluded.groom_name,
          contact_email = excluded.contact_email,
          contact_phone = excluded.contact_phone,
          event_type = excluded.event_type,
          dress_code = excluded.dress_code,
          special_instructions = excluded.special_instructions,
          website_url = excluded.website_url,
          app_title = excluded.app_title,
          updated_at = CURRENT_TIMESTAMP
      `;
    }
    const values = [
      enable_global_countdown ? 1 : 0, 
      wedding_date || null,
      venue_name || null,
      venue_address || null,
      event_start_date || null,
      event_end_date || null,
      event_time || null,
      bride_name || null,
      groom_name || null,
      contact_email || null,
      contact_phone || null,
      event_type || null,
      dress_code || null,
      special_instructions || null,
      website_url || null,
      app_title || null
    ];
    try {
      await dbRun(sql, values);
      // Clear template variables cache since settings changed
      const { clearSettingsCache } = require('../utils/templateVariables');
      clearSettingsCache();
      return res.json({ success: true });
    } catch (err) {
      return sendInternalError(res, err, 'PUT /setting');
    }
  }
);

module.exports = router;
