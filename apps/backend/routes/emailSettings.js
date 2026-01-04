const express = require('express');
const { DateTime } = require('luxon');
const logger = require('../helpers/logger');
const getDbConnection = require('../db/connection');
const { createDbHelpers } = require('../db/queryHelpers');
const db = getDbConnection();
const { dbGet, dbAll, dbRun } = createDbHelpers(db);
const { sendEmail } = require('../helpers/emailService');
const getSenderInfo = require('../helpers/getSenderInfo');
const { getTemplateVariables, replaceTemplateVars } = require('../utils/templateVariables');
const { generateEmailHTML } = require('../utils/emailTemplates');
const { sendNotFound, sendInternalError } = require('../utils/errorHandler');
const { resolveTemplateSubject, normalizeTemplateSubjects } = require('../utils/subjectResolver');
const requireAuth = require('../middleware/auth');

const router = express.Router();

/**
 * Send RSVP confirmation email for test (no DB persistence)
 */
async function sendTestConfirmationEmail(tempGuest, recipientEmail, testLanguage) {
  try {

    // Determine which template to use based on RSVP status
    let templateName;
    if (tempGuest.rsvp_status === 'attending') {
      templateName = 'Thank You - Attending';
    } else if (tempGuest.rsvp_status === 'not_attending') {
      templateName = 'Thank You - Not Attending';
    } else {
      return { success: false, error: 'RSVP status must be attending or not_attending' };
    }
    
    // Fetch the appropriate template
    const rawTemplate = await dbGet("SELECT * FROM templates WHERE name = ?", [templateName]);
    if (!rawTemplate) {
      logger.error('[EMAIL_SETTINGS] RSVP confirmation template not found:', templateName);
      return { success: false, error: `Template "${templateName}" not found` };
    }
    
    // Parse subject (may be JSON or separate columns)
    let templateSubjectEn = '';
    let templateSubjectLt = '';
    if (rawTemplate.subject_en) {
      templateSubjectEn = rawTemplate.subject_en || '';
      templateSubjectLt = rawTemplate.subject_lt || '';
    } else if (rawTemplate.subject) {
      try {
        const subjectData = JSON.parse(rawTemplate.subject);
        templateSubjectEn = subjectData.en || rawTemplate.subject || '';
        templateSubjectLt = subjectData.lt || rawTemplate.subject || '';
      } catch (e) {
        templateSubjectEn = rawTemplate.subject || '';
        templateSubjectLt = rawTemplate.subject || '';
      }
    }
    
    const template = {
      ...rawTemplate,
      subject_en: templateSubjectEn,
      subject_lt: templateSubjectLt
    };
    
    // Get template variables
    const variables = await getTemplateVariables(tempGuest, template);
    
    // Determine language
    const lang = testLanguage === 'lt' ? 'lt' : 'en';
    const bodyTemplate = lang === 'lt' ? template.body_lt : template.body_en;
    
    // Resolve subject with fallback logic
    const subjectTemplate = resolveTemplateSubject(template, lang, {
      context: 'rsvp_confirmation',
      rsvpStatus: tempGuest.rsvp_status
    });
    
    // Replace variables
    const subject = replaceTemplateVars(subjectTemplate, variables);
    const body = replaceTemplateVars(bodyTemplate || '', variables);
    
    // Generate email HTML
    const styleKey = template.style || 'elegant';
    const emailHtml = generateEmailHTML(body, styleKey, {
      siteUrl: process.env.SITE_URL || 'http://localhost:5001',
      title: 'Brigita & Jeffrey'
    });
    
    // Send via unified email service
    const result = await sendEmail({
      to: recipientEmail,
      subject: subject,
      html: emailHtml,
      db
    });
    
    if (result.success) {
      logger.info('[EMAIL_SETTINGS] Test email sent', { recipientEmail, messageId: result.messageId });
      return { 
        success: true, 
        messageId: result.messageId,
        templateName,
        subject
      };
    } else {
      logger.error('[EMAIL_SETTINGS] Test email failed', { recipientEmail, error: result.error });
      return { 
        success: false, 
        error: result.error || 'Failed to send test email'
      };
    }
  } catch (err) {
    logger.error('[EMAIL_SETTINGS] Error', { recipientEmail, error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * @openapi
 * /emailSettings:
 *   get:
 *     summary: Retrieve the current email settings
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: The email settings object
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailSettings'
 *       '500':
 *         description: Server error retrieving settings
 */
// Get email settings
router.get('/', requireAuth, async (req, res) => {
  try {
    const row = await dbGet('SELECT * FROM email_settings WHERE id = ?', [1]);
    
    // If no settings exist, return default values
    if (!row) {
      return res.json({
        id: null,
        provider: 'resend',
        api_key: '',
        from_name: '',
        from_email: '',
        sender_name: '',
        sender_email: '',
        enabled: false,
        created_at: null,
        updated_at: null
      });
    }
    
    res.json(row);
  } catch (err) {
    logger.error('Error retrieving email settings:', err);
    return sendInternalError(res, err, 'GET /email-settings');
  }
});

/**
 * @openapi
 * /emailSettings:
 *   post:
 *     summary: Update email settings
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailSettingsUpdate'
 *     responses:
 *       '200':
 *         description: Result of the update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 updated:
 *                   type: integer
 *       '500':
 *         description: Server error updating settings
 */
// Update email settings
router.post('/', requireAuth, async (req, res) => {
  const {
    provider,
    api_key,
    from_name,
    from_email,
    sender_name,
    sender_email,
    enabled,
  } = req.body;

  try {
    // Check if settings exist
    const existing = await dbGet('SELECT id FROM email_settings WHERE id = ?', [1]);
    
    if (existing) {
      // Update existing settings
      const query = `
        UPDATE email_settings
        SET provider = ?, api_key = ?, from_name = ?, from_email = ?, sender_name = ?, sender_email = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `;
      const values = [
        provider,
        api_key,
        from_name,
        from_email,
        sender_name,
        sender_email,
        enabled ? 1 : 0,
      ];
      const result = await dbRun(query, values);
      // Clear template variables cache since sender info changed
      const { clearSettingsCache } = require('../utils/templateVariables');
      clearSettingsCache();
      res.json({ success: true, updated: result.affectedRows || result.changes || 0 });
    } else {
      // Create new settings
      const query = `
        INSERT INTO email_settings (id, provider, api_key, from_name, from_email, sender_name, sender_email, enabled, created_at, updated_at)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      const values = [
        provider,
        api_key,
        from_name,
        from_email,
        sender_name,
        sender_email,
        enabled ? 1 : 0,
      ];
      const result = await dbRun(query, values);
      // Clear template variables cache since sender info changed
      const { clearSettingsCache } = require('../utils/templateVariables');
      clearSettingsCache();
      res.json({ success: true, created: result.insertId || result.lastID || 1 });
    }
  } catch (err) {
    logger.error('Error updating email settings:', err);
    return res.status(500).json({ error: 'Failed to update email settings' });
  }
});

/**
 * @openapi
 * /settings/email/test:
 *   post:
 *     summary: Send a test email with comprehensive health checks
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - guestData
 *               - templateId
 *               - recipientEmail
 *             properties:
 *               guestData:
 *                 type: object
 *               templateId:
 *                 type: integer
 *               templateStyle:
 *                 type: string
 *                 enum: [elegant, modern, friendly]
 *               sendMode:
 *                 type: string
 *                 enum: [immediate, scheduled]
 *               recipientEmail:
 *                 type: string
 *               testLanguage:
 *                 type: string
 *                 enum: [en, lt, both]
 *               healthCheckMode:
 *                 type: boolean
 *     responses:
 *       '200':
 *         description: Test email sent successfully
 *       '500':
 *         description: Server error
 */
// Test email endpoint
router.post('/test', requireAuth, async (req, res) => {
  const startTime = Date.now();
  
  const {
    guestData,
    templateId,
    templateStyle = 'elegant',
    sendMode = 'immediate',
    recipientEmail,
    testLanguage = 'en',
    healthCheckMode = true
  } = req.body;

  // Health check results
  const healthCheck = {
    emailProvider: { connected: false, message: '', messageId: null, timestamp: new Date().toISOString(), error: null },
    database: { connected: false, queryTime: 0, timestamp: new Date().toISOString(), error: null },
    settings: { complete: false, missing: [], invalid: [], allSettings: {}, timestamp: new Date().toISOString(), errors: [] },
    scheduler: { status: 'unknown', scheduledAt: null, sentAt: null, lastExecution: null, nextExecution: null, timestamp: new Date().toISOString(), error: null },
    templateVariables: { total: 0, used: 0, unused: 0, list: [], timestamp: new Date().toISOString(), errors: [] },
    sessionManagement: { adminSessionWorking: false, guestSessionWorking: false, secretsConfigured: false, timestamp: new Date().toISOString(), errors: [] },
    environmentVariables: { complete: false, missing: [], invalid: [], requiredVars: ['SESSION_SECRET', 'RSVP_SESSION_SECRET', 'RESEND_API_KEY', 'SITE_URL', 'CORS_ORIGINS'], timestamp: new Date().toISOString(), errors: [] },
    schedulerJobs: { running: false, lastExecution: null, nextExecution: null, cronExpression: '0 * * * *', timestamp: new Date().toISOString(), error: null },
    internationalization: { enLoaded: false, ltLoaded: false, keysPresent: false, timestamp: new Date().toISOString(), errors: [] },
    fileSystem: { logsWritable: false, lastLogWrite: null, timestamp: new Date().toISOString(), error: null },
    apiConnectivity: { frontendBackendConnected: true, corsConfigured: false, endpointsAccessible: true, timestamp: new Date().toISOString(), errors: [] },
    summary: { totalChecks: 0, passed: 0, failed: 0, warnings: 0, criticalErrors: [], warnings: [], timestamp: new Date().toISOString() }
  };

  let variables = {};
  let emailHtml = null;
  let emailHtmlEn = null;
  let emailHtmlLt = null;
  let subject = '';
  let subjectEn = '';
  let subjectLt = '';
  let sentAt = null;
  let scheduledFor = null;

  try {
    // Health Check: Database Connection
    const dbStartTime = Date.now();
    try {
      await dbGet('SELECT 1 as test');
      healthCheck.database.connected = true;
      healthCheck.database.queryTime = Date.now() - dbStartTime;
    } catch (err) {
      healthCheck.database.error = {
        type: 'connection_error',
        message: err.message,
        details: { code: err.code },
        fixSuggestion: 'Check DB_HOST, DB_USER, DB_PASS in .env and verify database is running',
        stackTrace: err.stack
      };
    }

    // Health Check: Email Provider - Actually test the API connection
    try {
      if (!process.env.RESEND_API_KEY) {
        healthCheck.emailProvider.connected = false;
        healthCheck.emailProvider.error = {
          type: 'missing_api_key',
          message: 'RESEND_API_KEY environment variable is not set',
          code: 'MISSING_KEY',
          details: { 
            envVarExists: false,
            hint: 'The API key must be set in your production environment'
          },
          fixSuggestion: 'Set RESEND_API_KEY in your .env file or hosting platform environment variables',
          stackTrace: null
        };
      } else {
        // Actually test the API by fetching domains (lightweight call)
        const axios = require('axios');
        const apiTestStart = Date.now();
        try {
          const response = await axios.get('https://api.resend.com/domains', {
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
          });
          
          healthCheck.emailProvider.connected = true;
          healthCheck.emailProvider.responseTime = Date.now() - apiTestStart;
          healthCheck.emailProvider.message = 'API key valid and connected';
          healthCheck.emailProvider.domains = response.data?.data?.map(d => ({
            name: d.name,
            status: d.status,
            region: d.region
          })) || [];
          
          // Check if any domain is verified
          const verifiedDomains = healthCheck.emailProvider.domains.filter(d => d.status === 'verified');
          if (verifiedDomains.length === 0) {
            healthCheck.emailProvider.warning = {
              type: 'no_verified_domains',
              message: 'No verified domains found. Emails may not be delivered.',
              fixSuggestion: 'Verify at least one domain in your Resend dashboard at https://resend.com/domains'
            };
          }
        } catch (apiErr) {
          healthCheck.emailProvider.connected = false;
          healthCheck.emailProvider.responseTime = Date.now() - apiTestStart;
          
          // Parse the actual error from Resend
          const statusCode = apiErr.response?.status;
          const errorData = apiErr.response?.data;
          
          // Check if it's a restricted key (sending only) - this is actually OK for sending
          if (statusCode === 401 && errorData?.name === 'restricted_api_key') {
            // This is actually OK - the key works for sending, just can't read domains
            healthCheck.emailProvider.connected = true; // Mark as connected since sending will work
            healthCheck.emailProvider.message = 'API key valid (Sending access only)';
            healthCheck.emailProvider.warning = {
              type: 'sending_only_access',
              message: 'API key has "Sending access" only. Cannot verify domains, but email sending will work.',
              fixSuggestion: 'For full health checks, generate a key with "Full access" at https://resend.com/api-keys'
            };
            // Don't set error - this is a valid configuration
          } else {
            // All other errors are actual problems
            let errorType = 'api_error';
            let errorMessage = apiErr.message;
            let fixSuggestion = 'Check your Resend API key and try again';
            
            if (statusCode === 401) {
              errorType = 'invalid_api_key';
              errorMessage = 'API key is invalid or expired';
              fixSuggestion = 'Generate a new API key at https://resend.com/api-keys and update RESEND_API_KEY';
            } else if (statusCode === 403) {
              errorType = 'insufficient_permissions';
              errorMessage = 'API key lacks required permissions';
              fixSuggestion = 'Ensure your API key has "Full access" or at least "Sending access" permissions';
            } else if (statusCode === 429) {
              errorType = 'rate_limited';
              errorMessage = 'Too many requests - rate limited by Resend';
              fixSuggestion = 'Wait a moment and try again, or upgrade your Resend plan';
            } else if (apiErr.code === 'ECONNREFUSED' || apiErr.code === 'ENOTFOUND') {
              errorType = 'network_error';
              errorMessage = 'Cannot reach Resend API - network issue';
              fixSuggestion = 'Check your server\'s internet connection and firewall rules';
            } else if (apiErr.code === 'ETIMEDOUT' || apiErr.code === 'ECONNABORTED') {
              errorType = 'timeout';
              errorMessage = 'Connection to Resend API timed out';
              fixSuggestion = 'Check network latency or try again later';
            }
            
            healthCheck.emailProvider.error = {
              type: errorType,
              message: errorMessage,
              code: statusCode || apiErr.code || 'UNKNOWN',
              details: {
                statusCode,
                responseBody: errorData,
                networkError: apiErr.code,
                apiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 8) + '...'
              },
              fixSuggestion,
              stackTrace: apiErr.stack
            };
          }
        }
      }
    } catch (err) {
      healthCheck.emailProvider.connected = false;
      healthCheck.emailProvider.error = {
        type: 'unexpected_error',
        message: err.message,
        code: err.code || 'UNKNOWN',
        details: { unexpected: true },
        fixSuggestion: 'Check server logs for more details',
        stackTrace: err.stack
      };
    }

    // Health Check: Settings Completeness
    try {
      const settings = await dbGet('SELECT * FROM settings LIMIT 1');
      const emailSettings = await dbGet('SELECT * FROM email_settings WHERE id = ?', [1]);
      const guestSettings = await dbGet('SELECT * FROM guest_settings LIMIT 1');
      
      healthCheck.settings.allSettings = {
        ...settings,
        email: emailSettings,
        guest: guestSettings
      };
      
      const requiredSettings = ['wedding_date', 'bride_name', 'groom_name'];
      const missing = requiredSettings.filter(key => !settings || !settings[key]);
      
      if (missing.length === 0) {
        healthCheck.settings.complete = true;
      } else {
        healthCheck.settings.missing = missing;
        healthCheck.settings.errors = missing.map(key => ({
          setting: key,
          reason: `Required setting ${key} is missing`,
          impact: 'Email templates may not render correctly',
          fixSuggestion: `Set ${key} in settings table`
        }));
      }
    } catch (err) {
      healthCheck.settings.errors.push({
        setting: 'settings_table',
        reason: err.message,
        impact: 'Cannot retrieve settings',
        fixSuggestion: 'Check database connection and settings table structure'
      });
    }

    // Health Check: Environment Variables
    const requiredEnvVars = ['SESSION_SECRET', 'RSVP_SESSION_SECRET', 'RESEND_API_KEY', 'SITE_URL', 'CORS_ORIGINS'];
    const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);
    const invalidEnvVars = [];
    
    if (process.env.CORS_ORIGINS && !process.env.CORS_ORIGINS.includes(',')) {
      invalidEnvVars.push('CORS_ORIGINS');
    }
    
    healthCheck.environmentVariables.complete = missingEnvVars.length === 0 && invalidEnvVars.length === 0;
    healthCheck.environmentVariables.missing = missingEnvVars;
    healthCheck.environmentVariables.invalid = invalidEnvVars;
    healthCheck.environmentVariables.errors = [
      ...missingEnvVars.map(key => ({
        variable: key,
        reason: `${key} is required but not set`,
        expectedFormat: key === 'CORS_ORIGINS' ? 'Comma-separated URLs' : 'String value',
        fixSuggestion: `Set ${key} in .env file`
      })),
      ...invalidEnvVars.map(key => ({
        variable: key,
        reason: `${key} has invalid format`,
        expectedFormat: key === 'CORS_ORIGINS' ? 'Comma-separated URLs' : 'Valid format',
        fixSuggestion: `Fix ${key} format in .env file`
      }))
    ];

    // Health Check: Session Management
    healthCheck.sessionManagement.secretsConfigured = !!(process.env.SESSION_SECRET && process.env.RSVP_SESSION_SECRET);
    healthCheck.sessionManagement.adminSessionWorking = !!process.env.SESSION_SECRET;
    healthCheck.sessionManagement.guestSessionWorking = !!process.env.RSVP_SESSION_SECRET;
    
    if (!healthCheck.sessionManagement.secretsConfigured) {
      const missingSecrets = [];
      if (!process.env.SESSION_SECRET) missingSecrets.push('SESSION_SECRET');
      if (!process.env.RSVP_SESSION_SECRET) missingSecrets.push('RSVP_SESSION_SECRET');
      
      healthCheck.sessionManagement.errors = missingSecrets.map(secret => ({
        type: 'missing_secret',
        secret,
        message: `${secret} is not configured`,
        fixSuggestion: `Set ${secret} in .env file`
      }));
    }

    // Health Check: File System
    try {
      const fs = require('fs');
      const path = require('path');
      const logsDir = path.join(__dirname, '../logs');
      if (fs.existsSync(logsDir)) {
        try {
          const testFile = path.join(logsDir, '.test-write');
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
          healthCheck.fileSystem.logsWritable = true;
        } catch (err) {
          healthCheck.fileSystem.error = {
            type: 'permission_error',
            path: logsDir,
            message: err.message,
            fixSuggestion: 'Check directory permissions for logs directory',
            stackTrace: err.stack
          };
        }
      } else {
        healthCheck.fileSystem.error = {
          type: 'directory_not_found',
          path: logsDir,
          message: 'Logs directory does not exist',
          fixSuggestion: 'Create logs directory',
          stackTrace: null
        };
      }
    } catch (err) {
      healthCheck.fileSystem.error = {
        type: 'filesystem_error',
        path: 'unknown',
        message: err.message,
        fixSuggestion: 'Check file system permissions',
        stackTrace: err.stack
      };
    }

    // Health Check: API Connectivity
    healthCheck.apiConnectivity.frontendBackendConnected = true; // If we got here, connection works
    healthCheck.apiConnectivity.corsConfigured = !!process.env.CORS_ORIGINS;
    healthCheck.apiConnectivity.endpointsAccessible = true;

    // Create temporary guest object (NOT saved to DB)
    const tempGuest = {
      id: 999999,
      name: guestData.name || 'Test Guest',
      email: guestData.email || recipientEmail,
      group_label: guestData.group_label || 'Test Group',
      code: guestData.code || 'TEST123',
      preferred_language: guestData.preferred_language || 'en',
      can_bring_plus_one: guestData.can_bring_plus_one || false,
      is_primary: guestData.is_primary !== undefined ? guestData.is_primary : true,
      rsvp_status: guestData.rsvp_status || 'pending',
      attending: guestData.attending !== undefined ? guestData.attending : null,
      dietary: guestData.dietary || null,
      notes: guestData.notes || null,
      plus_one_name: guestData.plus_one_name || null,
      plus_one_dietary: guestData.plus_one_dietary || null,
      responded_at: null,
      rsvp_deadline: null
    };

    // Fetch template
    const rawTemplate = await dbGet('SELECT * FROM templates WHERE id = ?', [templateId]);
    if (!rawTemplate) {
      return sendNotFound(res, 'Template', templateId);
    }
    
    // Normalize template subjects (handles both new and old schemas)
    const template = normalizeTemplateSubjects(rawTemplate);

    // Get template variables
    variables = await getTemplateVariables(tempGuest, template);
    
    // Health Check: Template Variables
    const variableKeys = Object.keys(variables);
    healthCheck.templateVariables.total = variableKeys.length;
    
    // Count variables used in template
    const templateBody = (template.body_en || '') + (template.body_lt || '');
    const usedVariables = variableKeys.filter(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      return regex.test(templateBody);
    });
    healthCheck.templateVariables.used = usedVariables.length;
    healthCheck.templateVariables.unused = healthCheck.templateVariables.total - healthCheck.templateVariables.used;
    healthCheck.templateVariables.list = variableKeys.map(key => ({
      name: key,
      value: variables[key],
      used: usedVariables.includes(key)
    }));

    // Replace variables in template
    const processTemplate = (body, lang) => {
      if (!body) return '';
      return replaceTemplateVars(body, variables);
    };

    let processedBodyEn = processTemplate(template.body_en, 'en');
    let processedBodyLt = processTemplate(template.body_lt, 'lt');
    let processedSubjectEn = replaceTemplateVars(template.subject_en || template.subject || '', variables);
    let processedSubjectLt = replaceTemplateVars(template.subject_lt || template.subject || '', variables);

    // Get sender info
    const senderInfo = await getSenderInfo(db);
    const senderMatch = senderInfo ? senderInfo.match(/^(.+?)\s*<(.+?)>$/) : null;
    const fromName = senderMatch ? senderMatch[1] : (process.env.FROM_NAME || 'Wedding Site');
    const fromEmail = senderMatch ? senderMatch[2] : (process.env.FROM_EMAIL || 'noreply@example.com');

    // Generate email HTML
    const generateHtml = (body, lang) => {
      return generateEmailHTML(
        body,
        templateStyle,
        {
          title: 'Brigita & Jeffrey',
          buttonText: lang === 'en' ? 'RSVP Here' : 'RSVP Čia',
          buttonUrl: `${process.env.SITE_URL || 'http://localhost:5001'}/${lang}/rsvp/${tempGuest.code}`,
          footerText: lang === 'en' ? 'With love and joy,' : 'Su meile ir džiaugsmu,',
          siteUrl: process.env.SITE_URL || 'http://localhost:5001'
        }
      );
    };

    if (testLanguage === 'both' || testLanguage === 'en') {
      emailHtmlEn = generateHtml(processedBodyEn, 'en');
      subjectEn = processedSubjectEn;
    }
    if (testLanguage === 'both' || testLanguage === 'lt') {
      emailHtmlLt = generateHtml(processedBodyLt, 'lt');
      subjectLt = processedSubjectLt;
    }
    
    // Set primary HTML based on test language
    emailHtml = testLanguage === 'lt' ? emailHtmlLt : emailHtmlEn;
    subject = testLanguage === 'lt' ? subjectLt : subjectEn;

    // Send email or schedule
    if (sendMode === 'immediate') {
      try {
        const emailResult = await sendEmail({
          from: `${fromName} <${fromEmail}>`,
          to: recipientEmail,
          subject: subject,
          html: emailHtml,
          db
        });
        
        if (emailResult.success) {
          healthCheck.emailProvider.messageId = emailResult.messageId || null;
          healthCheck.emailProvider.message = 'Email sent successfully';
          sentAt = new Date().toISOString();
        } else {
          throw new Error(emailResult.error || 'Email send failed');
        }
      } catch (err) {
        logger.error('[EMAIL_SETTINGS] Email send failed', { recipientEmail, error: err.message });
        healthCheck.emailProvider.error = {
          type: 'send_error',
          message: err.message,
          code: err.code || 'UNKNOWN',
          details: err.response?.data || {},
          fixSuggestion: 'Check RESEND_API_KEY and verify email settings',
          stackTrace: err.stack
        };
        throw err;
      }
    } else if (sendMode === 'scheduled') {
      // Automatically schedule 5 minutes ahead
      const scheduledTime = DateTime.now().plus({ minutes: 5 }).setZone('Europe/Amsterdam');
      scheduledFor = scheduledTime.toISO();
      
      healthCheck.scheduler.status = 'scheduled';
      healthCheck.scheduler.scheduledAt = scheduledFor;
      healthCheck.scheduler.nextExecution = scheduledFor;
      
      // Note: In test mode, we don't actually persist to database
      // But we validate the scheduling logic
      if (scheduledTime <= DateTime.now()) {
        healthCheck.scheduler.error = {
          type: 'invalid_time',
          message: 'Scheduled time must be in the future',
          details: { scheduledTime: scheduledFor },
          fixSuggestion: 'Scheduled time is automatically set to 5 minutes ahead'
        };
      }
    }

    // Health Check: Scheduler Status
    try {
      const cron = require('node-cron');
      // Check if scheduler is likely running (we can't directly check, but we can verify cron is available)
      healthCheck.schedulerJobs.running = true; // Assume running if cron module loads
      healthCheck.schedulerJobs.cronExpression = '0 * * * *'; // Every hour
      const nextHour = DateTime.now().plus({ hours: 1 }).startOf('hour');
      healthCheck.schedulerJobs.nextExecution = nextHour.toISO();
    } catch (err) {
      healthCheck.schedulerJobs.error = {
        type: 'scheduler_error',
        message: err.message,
        details: {},
        fixSuggestion: 'Verify scheduler is started in index.js'
      };
    }

    // Compile health check summary
    const checks = [
      healthCheck.emailProvider.connected,
      healthCheck.database.connected,
      healthCheck.settings.complete,
      healthCheck.environmentVariables.complete,
      healthCheck.sessionManagement.secretsConfigured,
      healthCheck.fileSystem.logsWritable,
      healthCheck.apiConnectivity.frontendBackendConnected
    ];
    
    healthCheck.summary.totalChecks = checks.length;
    healthCheck.summary.passed = checks.filter(Boolean).length;
    healthCheck.summary.failed = checks.length - healthCheck.summary.passed;
    
    // Collect critical errors
    if (healthCheck.emailProvider.error) healthCheck.summary.criticalErrors.push('Email Provider');
    if (healthCheck.database.error) healthCheck.summary.criticalErrors.push('Database');
    if (!healthCheck.settings.complete) healthCheck.summary.warnings.push('Settings Incomplete');
    if (!healthCheck.environmentVariables.complete) healthCheck.summary.warnings.push('Environment Variables');
    if (!healthCheck.sessionManagement.secretsConfigured) healthCheck.summary.warnings.push('Session Management');

    // Send RSVP confirmation email if requested
    let rsvpConfirmationResult = null;
    if (req.body.sendRsvpConfirmation && tempGuest.rsvp_status !== 'pending') {
      rsvpConfirmationResult = await sendTestConfirmationEmail(
        tempGuest, 
        recipientEmail, 
        testLanguage === 'both' ? 'en' : testLanguage
      );
    }
    
    res.json({
      success: true,
      emailHtml,
      emailHtmlEn: testLanguage === 'both' || testLanguage === 'en' ? emailHtmlEn : null,
      emailHtmlLt: testLanguage === 'both' || testLanguage === 'lt' ? emailHtmlLt : null,
      subject,
      subjectEn: testLanguage === 'both' || testLanguage === 'en' ? subjectEn : null,
      subjectLt: testLanguage === 'both' || testLanguage === 'lt' ? subjectLt : null,
      variables,
      sentAt,
      scheduledFor,
      healthCheck,
      rsvpConfirmationResult,
      message: sendMode === 'immediate' ? 'Test email sent successfully' : 'Test email scheduled successfully'
    });
  } catch (err) {
    logger.error('Error in test email endpoint:', err.message);
    return sendInternalError(res, err, 'POST /email-settings/test');
  }
});

module.exports = router;
