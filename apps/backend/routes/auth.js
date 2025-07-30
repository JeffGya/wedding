const express = require('express');
const bcrypt = require('bcryptjs');
const getDbConnection = require('../db/connection');
// Initialize database connection and helper methods for SQLite or MySQL
const db = getDbConnection();
let dbGet;
if (process.env.DB_TYPE === 'mysql') {
  dbGet = async (sql, params) => {
    const [rows] = await db.query(sql, params);
    return rows[0];
  };
} else {
  const sqlite3 = require('sqlite3').verbose();
  const util = require('util');
  dbGet = util.promisify(db.get.bind(db));
}

const router = express.Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Authenticate a user and create a session cookie
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 name:
 *                   type: string
 *       '400':
 *         description: Email and password are required
 *       '401':
 *         description: Invalid credentials
 *       '500':
 *         description: Database error
 */
router.post('/login', async (req, res) => {
  console.log('Login request received:');
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  try {
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) return res.status(401).json({ error: 'Invalid credentials.' });
    res.cookie('session_id', user.id, {
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      signed: true,
      maxAge: 1000 * 60 * 60 * 2 // 2 hours
    });
    return res.json({ success: true, name: user.name });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error.' });
  }
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Retrieve the current authenticated user's information
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: Authenticated user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *       '401':
 *         description: Unauthorized or invalid session
 */
router.get('/me', async (req, res) => {
  const sessionId = req.signedCookies?.session_id;
  if (!sessionId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const user = await dbGet('SELECT id, name, email FROM users WHERE id = ?', [sessionId]);
    if (!user) return res.status(401).json({ error: 'Invalid session.' });
    return res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error.' });
  }
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout the current user by clearing the session cookie
 *     responses:
 *       '200':
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post('/logout', (req, res) => {
  res.clearCookie('session_id', {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    signed: true,
  });

  res.json({ success: true, message: 'Logged out successfully.' });
});

module.exports = router;