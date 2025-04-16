// Backend entry point for wedding website
// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001; // Changed fallback port from 5000 to 5001

// Middleware to parse incoming JSON requests
app.use(express.json());

// Middleware to parse signed cookies using session secret
app.use(cookieParser(process.env.SESSION_SECRET));

// CORS config to allow frontend (localhost:5173) to communicate with backend
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// Public authentication routes
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

const adminRoutes = require('./routes/admin');
// Admin-only protected routes
app.use('/api/admin', adminRoutes);

const guestRoutes = require('./routes/guests');
// Guest management routes
app.use('/api/guests', guestRoutes); // Added guests route

// Import email settings routes
const emailSettingsRoutes = require('./routes/emailSettings');
// Email settings route for sending and saving provider settings
app.use('/api/settings/email', emailSettingsRoutes);

const messageRoutes = require('./routes/messages');
app.use('/api/messages', messageRoutes); // Added messages route

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});