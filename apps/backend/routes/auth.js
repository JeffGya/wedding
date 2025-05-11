const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const router = express.Router();

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

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
router.post('/login', (req, res) => {
  console.log('Login request received:', req.body);
  
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const query = `SELECT * FROM users WHERE email = ?`;
  db.get(query, [email], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
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

    res.json({ success: true, name: user.name });
  });
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
router.get('/me', (req, res) => {
  const sessionId = req.signedCookies?.session_id;
  if (!sessionId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const query = `SELECT id, name, email FROM users WHERE id = ?`;
  db.get(query, [sessionId], (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!user) return res.status(401).json({ error: 'Invalid session.' });

    res.json({ id: user.id, name: user.name, email: user.email });
  });
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