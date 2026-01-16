const express = require('express');
const router = express.Router();
const getDbConnection = require('../db/connection');
const { createDbHelpers } = require('../db/queryHelpers');
const logger = require('../helpers/logger');
const { sendInternalError } = require('../utils/errorHandler');
const db = getDbConnection();
const { dbGet, dbAll } = createDbHelpers(db);
const requireAuth = require('../middleware/auth');

// Require authentication for this route
router.use(requireAuth);

/**
 * @openapi
 * /messages/{id}/stats:
 *   get:
 *     summary: Get delivery statistics for a message by ID
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
 *         description: Delivery statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 sentCount:
 *                   type: integer
 *                 failedCount:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       '500':
 *         description: Failed to fetch delivery statistics
 */
router.get('/:id/stats', async (req, res) => {
  const messageId = req.params.id;
  const sql = `
    SELECT 
      COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) AS sentCount,
      COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) AS failedCount,
      COUNT(*) AS total
    FROM message_recipients
    WHERE message_id = ?
  `;
  try {
    const row = await dbGet(sql, [messageId]);
    res.json({ success: true, ...row });
  } catch (err) {
    logger.error('📉 Failed to fetch delivery stats:', err.message);
    return sendInternalError(res, err, 'GET /messages/:id/stats');
  }
});

/**
 * @openapi
 * /messages/latest-delivery:
 *   get:
 *     summary: Retrieve delivery stats for the most recently created message
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: Statistics for the latest message, or zero stats if no messages exist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message_id:
 *                   type: integer
 *                   nullable: true
 *                 sentCount:
 *                   type: integer
 *                 failedCount:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       '500':
 *         description: Failed to fetch latest delivery statistics
 */
router.get('/latest-delivery', async (req, res) => {
  const sql = `
    SELECT id AS message_id
    FROM messages
    ORDER BY created_at DESC
    LIMIT 1
  `;
  try {
    const latest = await dbGet(sql, []);
    if (!latest) {
      // No messages exist yet - return zero stats gracefully
      return res.json({
        success: true,
        message_id: null,
        sentCount: 0,
        failedCount: 0,
        total: 0
      });
    }
    const statsSql = `
      SELECT 
        COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) AS sentCount,
        COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) AS failedCount,
        COUNT(*) AS total
      FROM message_recipients
      WHERE message_id = ?
    `;
    const row = await dbGet(statsSql, [latest.message_id]);
    res.json({ success: true, message_id: latest.message_id, ...row });
  } catch (err) {
    logger.error('📉 Failed to fetch latest delivery stats:', err.message);
    return sendInternalError(res, err, 'GET /messages/stats/latest-delivery');
  }
});

module.exports = router;
