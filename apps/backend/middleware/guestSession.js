const cookieParser = require('cookie-parser');
const getDbConnection = require('../db/connection');
const rawDb = getDbConnection();

let dbGet;
if (process.env.DB_TYPE === 'mysql') {
  dbGet = async (sql, params) => {
    const [rows] = await rawDb.query(sql, params);
    return rows[0];
  };
} else {
  const util = require('util');
  dbGet = util.promisify(rawDb.get).bind(rawDb);
}

const COOKIE_NAME = 'rsvp_session';
const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

module.exports = {
  /**
   * Middleware to parse guest session from signed cookie
   */
  parseGuestSession: (req, res, next) => {
    let sessionRaw = req.signedCookies?.[COOKIE_NAME];
    if (typeof sessionRaw === 'string') {
      try {
        sessionRaw = JSON.parse(sessionRaw);
      } catch (err) {
        console.error('[guestSession] Failed to parse cookie JSON:', err);
        req.guest = null;
        req.guestId = null;
        return next();
      }
    }
    const session = sessionRaw;

    if (!session || !session.guestId || !session.code) {
      console.log('[guestSession] No valid guest session cookie found.');
      req.guest = null;
      req.guestId = null;
      return next();
    }

    const { guestId, code } = session;

    dbGet('SELECT * FROM guests WHERE id = ? AND code = ?', [guestId, code])
      .then((guest) => {
        if (!guest) {
          console.log('[guestSession] No matching guest found for session.');
          req.guest = null;
          req.guestId = null;
        } else {
          console.log(`[guestSession] Guest session parsed successfully: ${guestId}`);
          req.guest = guest;
          req.guestId = guest.id;
        }
        next();
      })
      .catch((err) => {
        console.error('[guestSession] DB error while parsing session:', err);
        req.guest = null;
        req.guestId = null;
        next();
      });
  },

  /**
   * Utility to set guest session cookie after RSVP
   */
  setGuestSession: (res, guestId, code) => {
    console.log(`[guestSession] Setting session for guestId=${guestId}`);
    res.cookie(COOKIE_NAME, { guestId, code }, {
      httpOnly: true,
      sameSite: 'lax',
      signed: true,
      maxAge: COOKIE_MAX_AGE,
    });
  },

  /**
   * Utility to clear the guest session cookie
   */
  clearGuestSession: (res) => {
    console.log('[guestSession] Clearing guest session cookie');
    res.clearCookie(COOKIE_NAME);
  },
};