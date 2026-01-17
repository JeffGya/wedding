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
  const serialize = (a) => {
    if (a instanceof Error) return a.stack || a.message || String(a);
    if (typeof a === 'object') {
      try { return JSON.stringify(a); } catch { return String(a); }
    }
    return String(a);
  };
  const line = `[${new Date().toISOString()}] ` + args.map(serialize).join(' ') + '\n';
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
const logger = require('./helpers/logger');

const requireAuth = require('./middleware/auth');

const adminRoutes = require('./routes/admin');
const imagesRoutes = require('./routes/images');
const pagesRoutes = require('./routes/adminPages');

const publicPagesRoutes = require('./routes/publicPages');
const { parseGuestSession } = require('./middleware/guestSession');
const adminSurveysRoutes = require('./routes/adminSurveys');
const publicSurveysRoutes = require('./routes/publicSurveys');
const adminSurveyResponsesRoutes = require('./routes/adminSurveyResponses');

// ---- Grouped admin router (all /api/admin/*)
const adminRouter = express.Router();
adminRouter.use(requireAuth);
adminRouter.use('/', adminRoutes);
adminRouter.use('/pages', pagesRoutes);
adminRouter.use('/images', imagesRoutes);

adminRouter.use('/surveys', adminSurveysRoutes);
adminRouter.use('/surveys/:id/responses', adminSurveyResponsesRoutes);



// ---- Global process-level error handlers ----
process.on('unhandledRejection', (err) => {
  logger.error('UnhandledRejection:', err instanceof Error ? err.stack : err);
});
process.on('uncaughtException', (err) => {
  logger.error('UncaughtException:', err instanceof Error ? err.stack : err);
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5001; // Changed fallback port from 5000 to 5001

// Load allowed CORS origins from env var CORS_ORIGINS (comma-separated)
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : [];

// Middleware to parse incoming JSON requests with sane limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Middleware to parse signed cookies using session secret
app.use(cookieParser(process.env.SESSION_SECRET));

// Add RSVP session cookie parser with a separate secret
const cookieParserRSVP = cookieParser(process.env.RSVP_SESSION_SECRET);
app.use((req, res, next) => {
  cookieParserRSVP(req, res, next);
});
// Attach guest session globally so req.guest is available everywhere (RSVP/session endpoint, public pages, etc.)
app.use(parseGuestSession);

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
  apis: [
    path.join(__dirname, 'routes', '*.js'),
    path.join(__dirname, 'routes', '**', '*.js')
  ],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Public authentication routes
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);

app.use('/api/admin', adminRouter);

const guestRoutes = require('./routes/guests');
const rsvpRouter = require('./routes/rsvp');
// Guest management routes
app.use('/api/guests', guestRoutes); // Added guests route
app.use('/api/rsvp', rsvpRouter);
app.use('/api/surveys', publicSurveysRoutes);

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
app.use('/api/templates', templateRoutes);
app.use('/api/message-stats', messageStatsRoutes); // Adds message delivery stats route
app.use('/api/pages', parseGuestSession, publicPagesRoutes);

// Simple health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler (backward-compatible shape)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Server error';
  const code = err.code || err.errorCode;

  // Log full error & stack
  logger.error('🔥 Error handler caught:', err.stack || err);

  const payload = {
    error: { message },
    // legacy field so existing frontend code using `message` still works
    message
  };

  if (code) payload.error.code = code;

  // Expose stack only in non-production
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.error.stack = err.stack;
  }

  res.status(status).json(payload);
});

// Start the background scheduler
startScheduler();

// Start server
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
}).on('error', (err) => {
  logger.error(`Failed to start server on port ${PORT}:`, err);
});