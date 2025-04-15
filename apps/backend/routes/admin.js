const express = require('express');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// Example protected route
router.get('/secret', requireAuth, (req, res) => {
  res.json({
    message: `Welcome, Admin! Your user ID is ${req.userId}.`
  });
});

module.exports = router;
