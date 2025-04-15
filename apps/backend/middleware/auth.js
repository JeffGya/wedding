const requireAuth = (req, res, next) => {
  const sessionId = req.signedCookies?.session_id;
  if (!sessionId) {
    return res.status(401).json({ error: 'Unauthorized: No session' });
  }

  // Refresh the session cookie to extend expiration
  res.cookie('session_id', sessionId, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    signed: true,
    maxAge: 1000 * 60 * 60 * 2 // 2 hours
  });

  // Attach user ID to request for downstream use
  req.userId = sessionId;
  next();
};

module.exports = requireAuth;
