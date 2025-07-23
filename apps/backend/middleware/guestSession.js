// apps/backend/middleware/guestSession.js
// Parses and maintains a lightweight RSVP guest session via signed cookie.
// Uses driver-agnostic DB calls, refreshes cookie TTL, and clears bad cookies.

'use strict';

const getDb = require('../db/connection');

const COOKIE_NAME = 'rsvp_session';
const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

// ---------------------- DB helpers ----------------------
async function queryOne(sql, params = []) {
  const db = getDb();

  // mysql2/promise style
  if (typeof db.query === 'function') {
    const [rows] = await db.query(sql, params);
    return rows[0] || null;
  }

  // sqlite3 verbose style
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

// ---------------------- Helpers ----------------------
function safeParse(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function refreshCookie(res, payload) {
  res.cookie(COOKIE_NAME, payload, {
    httpOnly: true,
    sameSite: 'lax',
    signed: true,
    maxAge: COOKIE_MAX_AGE,
  });
}

// ---------------------- Middleware ----------------------
async function parseGuestSession(req, res, next) {
  let raw = req.signedCookies?.[COOKIE_NAME];

  // Express signs objects as JSON by default, but be defensive
  const session = safeParse(raw) ?? raw;

  if (!session || !session.guestId || !session.code) {
    req.guest = null;
    req.guestId = null;
    return next();
  }

  try {
    const { guestId, code } = session;
    const guest = await queryOne(
      'SELECT * FROM guests WHERE id = ? AND code = ?',
      [guestId, code]
    );

    if (!guest) {
      console.log('[guestSession] Invalid guest cookie. Clearing.');
      res.clearCookie(COOKIE_NAME);
      req.guest = null;
      req.guestId = null;
      return next();
    }

    // Success: attach guest + refresh cookie
    req.guest = guest;
    req.guestId = guest.id;
    refreshCookie(res, { guestId, code });
    return next();
  } catch (err) {
    console.error('[guestSession] DB error while parsing session:', err);
    req.guest = null;
    req.guestId = null;
    return next();
  }
}

function setGuestSession(res, guestId, code) {
  console.log(`[guestSession] Setting session for guestId=${guestId}`);
  refreshCookie(res, { guestId, code });
}

function clearGuestSession(res) {
  console.log('[guestSession] Clearing guest session cookie');
  res.clearCookie(COOKIE_NAME);
}

module.exports = {
  parseGuestSession,
  setGuestSession,
  clearGuestSession,
};