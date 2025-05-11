const express = require('express');
const router = express.Router();
const getDbConnection = require('../db/connection');
const db = getDbConnection();
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
router.get('/:id/stats', (req, res) => {
  const messageId = req.params.id;

  const sql = `
    SELECT 
      COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) AS sentCount,
      COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) AS failedCount,
      COUNT(*) AS total
    FROM message_recipients
    WHERE message_id = ?
  `;

  db.get(sql, [messageId], (err, row) => {
    if (err) {
      console.error('📉 Failed to fetch delivery stats:', err.message);
      return res.status(500).json({ success: false, error: 'Failed to get delivery stats' });
    }
    res.json({ success: true, ...row });
  });
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
 *         description: Statistics for the latest message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message_id:
 *                   type: integer
 *                 sentCount:
 *                   type: integer
 *                 failedCount:
 *                   type: integer
 *                 total:
 *                   type: integer
 *       '500':
 *         description: Failed to fetch latest delivery statistics
 */
router.get('/latest-delivery', (req, res) => {
  const sql = `
    SELECT id AS message_id
    FROM messages
    ORDER BY created_at DESC
    LIMIT 1
  `;

  db.get(sql, [], (err, latest) => {
    if (err || !latest) {
      console.error('📉 Failed to find latest message ID:', err?.message);
      return res.status(500).json({ success: false, error: 'Failed to get latest message' });
    }

    const statsSql = `
      SELECT 
        COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) AS sentCount,
        COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) AS failedCount,
        COUNT(*) AS total
      FROM message_recipients
      WHERE message_id = ?
    `;

    db.get(statsSql, [latest.message_id], (err, row) => {
      if (err) {
        console.error('📉 Failed to fetch delivery stats:', err.message);
        return res.status(500).json({ success: false, error: 'Failed to get delivery stats' });
      }
      res.json({ success: true, message_id: latest.message_id, ...row });
    });
  });
});

module.exports = router;
