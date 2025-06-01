const express = require('express');
const router = express.Router();
const getDbConnection = require('../db/connection');
const requireAuth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const logger = require('../helpers/logger');

// Initialize database connection and helper methods for SQLite or MySQL
const db = getDbConnection();
let dbGet, dbRun;
if (process.env.DB_TYPE === 'mysql') {
  // MySQL: use promise-based pool
  dbGet = async (sql, params) => {
    const [rows] = await db.query(sql, params);
    return rows[0];
  };
  dbRun = async (sql, params) => {
    const [result] = await db.query(sql, params);
    return result;
  };
} else {
  // SQLite: promisify get and run
  const sqlite3 = require('sqlite3').verbose();
  const util = require('util');
  dbGet = util.promisify(db.get.bind(db));
  dbRun = util.promisify(db.run.bind(db));
}

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
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch email settings' });
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
    console.error(err);
    return res.status(500).json({ error: 'Failed to update email settings' });
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
      'SELECT enable_global_countdown AS enableGlobalCountdown, wedding_date AS weddingDate FROM settings WHERE id = 1'
    );

    let plainDate = null;
    if (row && row.weddingDate) {
      const d = new Date(row.weddingDate);
      plainDate = d.toISOString().slice(0, 10);
    }

    return res.json({
      enableGlobalCountdown: row ? Boolean(row.enableGlobalCountdown) : false,
      weddingDate: plainDate
    });
  } catch (err) {
    logger.error(err);
    return res.status(500).json({ error: 'Failed to fetch main settings' });
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
      return res.status(400).json({ errors: errors.array() });
    }
    const { enable_global_countdown, wedding_date } = req.body;
    let sql;
    if (process.env.DB_TYPE === 'mysql') {
      sql = `
        INSERT INTO settings (id, enable_global_countdown, wedding_date, created_at, updated_at)
        VALUES (1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
          enable_global_countdown = VALUES(enable_global_countdown),
          wedding_date = VALUES(wedding_date),
          updated_at = CURRENT_TIMESTAMP
      `;
    } else {
      sql = `
        INSERT INTO settings (id, enable_global_countdown, wedding_date, created_at, updated_at)
        VALUES (1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          enable_global_countdown = excluded.enable_global_countdown,
          wedding_date = excluded.wedding_date,
          updated_at = CURRENT_TIMESTAMP
      `;
    }
    const values = [enable_global_countdown ? 1 : 0, wedding_date || null];
    try {
      await dbRun(sql, values);
      return res.json({ success: true });
    } catch (err) {
      logger.error(err);
      return res.status(500).json({ error: 'Failed to update main settings' });
    }
  }
);

module.exports = router;
