const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Simple file logger that appends timestamped messages
const logFile = path.join(logDir, 'server.log');
function fileLog(...args) {
  const line = `[${new Date().toISOString()}] ` +
    args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ') +
    '\n';
  fs.appendFile(logFile, line, err => {
    if (err) process.stderr.write('Log write failed: ' + err + '\n');
  });
}

// Override console methods to also write to file
console.log = fileLog;
console.error = fileLog;

// Backend entry point for wedding website
// Load environment vars from .env, .env-staging, or .env-production based on NODE_ENV
const envFile = process.env.NODE_ENV ? `.env-${process.env.NODE_ENV}` : '.env';
require('dotenv').config({ path: envFile });

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const startScheduler = require('./jobs/scheduler');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001; // Changed fallback port from 5000 to 5001

// Load allowed CORS origins from env var CORS_ORIGINS (comma-separated)
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : [];

// Middleware to parse incoming JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

// Middleware to parse signed cookies using session secret
app.use(cookieParser(process.env.SESSION_SECRET));

// Dynamic CORS based on CORS_ORIGINS env var
app.use(cors({
  origin: (origin, callback) => {
    //console.log('🔎 Incoming Origin:', origin);
    //console.log('✅ Allowed Origins:', allowedOrigins);

    if (!origin) return callback(null, true); // Allow Postman, curl, etc.

    const normalized = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(o => o === normalized);

    if (isAllowed) {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true
}));

// Serve uploaded images
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'))
);
// Serve uploaded images via API path for staging proxies
app.use(
  '/api/uploads',
  express.static(path.join(__dirname, 'uploads'))
);

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Wedding Site API',
      version: '1.0.0',
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: process.env.SESSION_COOKIE_NAME || 'connect.sid',
        },
      },
    },
  },
  apis: [path.join(__dirname, 'routes/*.js')],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Public authentication routes
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

const imagesRoutes = require('./routes/images');
app.use('/api/admin/images', imagesRoutes);

const guestRoutes = require('./routes/guests');
const rsvpRouter = require('./routes/rsvp');
// Guest management routes
app.use('/api/guests', guestRoutes); // Added guests route
app.use('/api/rsvp', rsvpRouter);

// Import email settings routes
const emailSettingsRoutes = require('./routes/emailSettings');
app.use('/api/settings/email', emailSettingsRoutes);
const guestSettingsRoutes = require('./routes/guestSettings');
app.use('/api/settings/guests', guestSettingsRoutes);

const settingRoutes = require('./routes/setting');
app.use('/api/settings/main', settingRoutes);

const messageRoutes = require('./routes/messages');
app.use('/api/messages', messageRoutes); // All message-related routes including send, resend, logs, etc.

const templateRoutes = require('./routes/templates');
const messageStatsRoutes = require('./routes/messageStats');
const pagesRoutes = require('./routes/adminPages');
const publicPagesRoutes = require('./routes/publicPages');
app.use('/api/templates', templateRoutes);
app.use('/api/message-stats', messageStatsRoutes); // Adds message delivery stats route
app.use('/api/admin/pages', pagesRoutes);
app.use('/api/pages', publicPagesRoutes);

// Start the background scheduler
startScheduler();

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});