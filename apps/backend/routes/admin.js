const express = require('express');
const requireAuth = require('../middleware/auth');

const router = express.Router();

/**
 * @openapi
 * /admin/secret:
 *   get:
 *     summary: Example protected admin route
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Welcome message for admin with user ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
// Example protected route
router.get('/secret', requireAuth, (req, res) => {
  res.json({
    message: `Welcome, Admin! Your user ID is ${req.userId}.`
  });
});

module.exports = router;
