const express = require('express');
const router = express.Router();
const getDbConnection = require('../db/connection');
const { createDbHelpers } = require('../db/queryHelpers');
const db = getDbConnection();
const { dbGet, dbAll, dbRun } = createDbHelpers(db);
const { getTemplateVariables, replaceTemplateVars } = require('../utils/templateVariables');
const { detectTemplateSchema } = require('../utils/templateSchema');
const { formatDateWithoutTime, formatRsvpDeadline, formatDateWithTime } = require('../utils/dateFormatter');
const { resolveTemplateSubject, normalizeTemplateSubjects } = require('../utils/subjectResolver');

const requireAuth = require('../middleware/auth');
const { generateButtonHTML, getAvailableStyles, extractButton } = require('../utils/emailTemplates');
const { generateEmailFromTemplate } = require('../helpers/emailGeneration');
const { sendBadRequest, sendNotFound, sendInternalError } = require('../utils/errorHandler');
const logger = require('../helpers/logger');
const { getBySlug: getPageBySlug } = require('../db/models/pages');

// Protect all routes
router.use(requireAuth);

/**
 * Validate button page slug if button type is 'page'
 * @param {string} bodyEn - English body content
 * @param {string} bodyLt - Lithuanian body content
 * @returns {Promise<{valid: boolean, error: string|null}>}
 */
async function validateButtonPageSlug(bodyEn, bodyLt) {
  // Extract button from both language versions
  const buttonEn = bodyEn ? extractButton(bodyEn).button : null;
  const buttonLt = bodyLt ? extractButton(bodyLt).button : null;
  
  // Check if any button has type 'page'
  const buttonsToValidate = [buttonEn, buttonLt].filter(b => b && b.type === 'page');
  
  if (buttonsToValidate.length === 0) {
    return { valid: true, error: null };
  }
  
  // Validate each page slug
  for (const button of buttonsToValidate) {
    if (!button.value || !button.value.trim()) {
      logger.warn('[TEMPLATE_VALIDATION] Page-type button missing slug value', { button });
      return { valid: false, error: 'Button with type "page" must have a page slug specified.' };
    }
    
    const slug = button.value.trim();
    
      try {
        // Check if page exists and is published
        const page = await getPageBySlug(slug);
      
      if (!page) {
        logger.warn('[TEMPLATE_VALIDATION] Page not found', { slug });
        return { valid: false, error: `Page with slug "${slug}" does not exist. Please select a valid page or remove the button.` };
      }
      
      if (!page.is_published) {
        logger.warn('[TEMPLATE_VALIDATION] Page is not published', { slug, is_published: page.is_published });
        return { valid: false, error: `Page "${slug}" is not published. Please publish the page or select a different page.` };
      }
    } catch (error) {
      logger.error('[TEMPLATE_VALIDATION] Error validating page slug', { slug, error: error.message });
      return { valid: false, error: `Error validating page slug "${slug}": ${error.message}` };
    }
  }
  
  return { valid: true, error: null };
}


/**
 * @openapi
 * /templates:
 *   get:
 *     summary: Retrieve all message templates
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: A list of templates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 templates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Template'
 *       '500':
 *         description: Database error
 */
// Get all templates
router.get('/', async (req, res) => {
  const sql = `SELECT * FROM templates ORDER BY created_at DESC`;
  try {
    const rows = await dbAll(sql, []);
    
    // Detect schema version once
    const schemaVersion = await detectTemplateSchema(db);
    
    // Parse subject based on schema version
    const templates = rows.map(row => {
      let subjectEn = '';
      let subjectLt = '';
      if (schemaVersion === 'new') {
        // New schema: direct columns
        subjectEn = row.subject_en || '';
        subjectLt = row.subject_lt || '';
      } else {
        // Old schema: JSON in subject column
        try {
          const subjectData = JSON.parse(row.subject || '{}');
          subjectEn = subjectData.en || row.subject || '';
          subjectLt = subjectData.lt || row.subject || '';
        } catch (e) {
          // Backward compatibility: if subject is not JSON, use it for both
          subjectEn = row.subject || '';
          subjectLt = row.subject || '';
        }
      }
      
      return {
        ...row,
        subject: subjectEn, // Keep backward compatibility with 'subject' field
        subject_en: subjectEn,
        subject_lt: subjectLt
      };
    });
    res.json({ success: true, templates });
  } catch (err) {
    return sendInternalError(res, err, 'GET /templates');
  }
});

// Add route to get available template styles - MUST BE BEFORE /:id route
router.get('/styles', async (req, res) => {
  try {
    const styles = getAvailableStyles();
    res.json({ success: true, styles });
  } catch (error) {
    logger.error('❌ Error fetching template styles:', error);
    logger.error('Error stack:', error.stack);
    return sendInternalError(res, error, 'GET /templates/styles');
  }
});

// Get preview variables - MUST BE BEFORE /:id route
router.get('/preview-variables', async (req, res) => {
  try {
    const { getAvailableVariables } = require('../utils/templateVariables');
    const variables = getAvailableVariables();

    // Get sample guests
    const sampleGuests = await dbAll(`
      SELECT id, name, group_label, preferred_language, rsvp_status, can_bring_plus_one
      FROM guests 
      WHERE email IS NOT NULL 
      ORDER BY name 
      LIMIT 10
    `);

    res.json({
      success: true,
      variables,
      sampleGuests,
      conditionalExamples: {
        "{{#if can_bring_plus_one}}...{{/if}}": "Show content only if guest can bring plus one",
        "{{#if plus_one_name}}...{{else}}...{{/if}}": "Show different content based on plus one status",
        "{{#if rsvp_status === 'attending'}}...{{else}}...{{/if}}": "Show content based on RSVP status",
        "{{#if group_label === 'Bride\\'s Family'}}...{{/if}}": "Show content for specific groups"
      }
    });
  } catch (err) {
    logger.error('Error getting preview variables:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * @openapi
 * /templates/{id}:
 *   get:
 *     summary: Retrieve a single template by ID
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: A template object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 template:
 *                   $ref: '#/components/schemas/Template'
 *       '404':
 *         description: Template not found
 *       '500':
 *         description: Database error
 */
// Get a single template
router.get('/:id', async (req, res) => {
  const sql = `SELECT * FROM templates WHERE id = ?`;
  try {
    const row = await dbGet(sql, [req.params.id]);
    if (!row) return sendNotFound(res, 'Template', req.params.id);
    
    // Detect schema version
    const schemaVersion = await detectTemplateSchema(db);
    
    // Parse subject based on schema version
    // Normalize template subjects (handles both new and old schemas)
    const template = normalizeTemplateSubjects(row);
    res.json({ success: true, template });
  } catch (err) {
    return sendInternalError(res, err, 'GET /templates');
  }
});

/**
 * @openapi
 * /templates:
 *   post:
 *     summary: Create a new message template
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TemplateCreate'
 *     responses:
 *       '200':
 *         description: Template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 id:
 *                   type: integer
 *       '400':
 *         description: Validation error (missing fields)
 *       '500':
 *         description: Database error
 */
// Create a new template
router.post('/', async (req, res) => {
  try {
    const { name, subject, subject_en, subject_lt, body_en, body_lt, style } = req.body;
    
    // Validate style if provided
    if (style) {
      const availableStyles = getAvailableStyles();
      const validStyle = availableStyles.find(s => s.key === style);
      if (!validStyle) {
        return sendBadRequest(res, 'Invalid template style');
      }
    }
    
    // Support both 'subject' (backward compatibility) and 'subject_en'/'subject_lt'
    const finalSubjectEn = subject_en || subject || '';
    const finalSubjectLt = subject_lt || subject || '';
    
    if (!name || !finalSubjectEn || !body_en || !body_lt) {
      return sendBadRequest(res, 'Name, subject (or subject_en), body_en, and body_lt are required.');
    }

    // Validate button page slug if button type is 'page'
    const buttonValidation = await validateButtonPageSlug(body_en, body_lt);
    if (!buttonValidation.valid) {
      logger.warn('[TEMPLATE_CREATE] Button validation failed', { error: buttonValidation.error });
      return sendBadRequest(res, buttonValidation.error);
    }

    // Detect schema version
    const schemaVersion = await detectTemplateSchema(db);
    
    let sql, params;
    if (schemaVersion === 'new') {
      // New schema: separate subject_en and subject_lt columns
      sql = `INSERT INTO templates (name, subject_en, subject_lt, body_en, body_lt, style) VALUES (?, ?, ?, ?, ?, ?)`;
      params = [name, finalSubjectEn, finalSubjectLt, body_en, body_lt, style];
    } else {
      // Old schema: single subject column with JSON
      const subjectJson = JSON.stringify({ en: finalSubjectEn, lt: finalSubjectLt });
      sql = `INSERT INTO templates (name, subject, body_en, body_lt, style) VALUES (?, ?, ?, ?, ?)`;
      params = [name, subjectJson, body_en, body_lt, style];
    }
    
    const result = await dbRun(sql, params);
    const templateId = result.insertId || result.lastID;

    // Fetch the created template
    const templateRow = await dbGet('SELECT * FROM templates WHERE id = ?', [templateId]);
    
    // Parse subject based on schema version
    let subjectEn = '';
    let subjectLt = '';
    if (schemaVersion === 'new') {
      // New schema: direct columns
      subjectEn = templateRow.subject_en || '';
      subjectLt = templateRow.subject_lt || '';
    } else {
      // Old schema: JSON in subject column
      try {
        const subjectData = JSON.parse(templateRow.subject || '{}');
        subjectEn = subjectData.en || templateRow.subject || '';
        subjectLt = subjectData.lt || templateRow.subject || '';
      } catch (e) {
        // Backward compatibility: if subject is not JSON, use it for both
        subjectEn = templateRow.subject || '';
        subjectLt = templateRow.subject || '';
      }
    }
    
    const template = {
      ...templateRow,
      subject: subjectEn, // Keep backward compatibility with 'subject' field
      subject_en: subjectEn,
      subject_lt: subjectLt
    };
    
    res.status(201).json({ 
      success: true, 
      template 
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    logger.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState
    });
    return sendInternalError(res, error, 'POST /templates');
  }
});

/**
 * @openapi
 * /templates/{id}:
 *   put:
 *     summary: Update an existing message template
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TemplateCreate'
 *     responses:
 *       '200':
 *         description: Template updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '400':
 *         description: Validation error (missing fields)
 *       '404':
 *         description: Template not found
 *       '500':
 *         description: Database error
 */
// Update a template
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, subject_en, subject_lt, body_en, body_lt, style = 'elegant' } = req.body;
    
    // Validate style if provided
    if (style) {
      const availableStyles = getAvailableStyles();
      const validStyle = availableStyles.find(s => s.key === style);
      if (!validStyle) {
        return sendBadRequest(res, 'Invalid template style');
      }
    }
    
    // Support both 'subject' (backward compatibility) and 'subject_en'/'subject_lt'
    const finalSubjectEn = subject_en || subject || '';
    const finalSubjectLt = subject_lt || subject || '';
    
    if (!name || !finalSubjectEn || !body_en || !body_lt) {
      return sendBadRequest(res, 'Name, subject (or subject_en), body_en, and body_lt are required.');
    }

    // Validate button page slug if button type is 'page'
    const buttonValidation = await validateButtonPageSlug(body_en, body_lt);
    if (!buttonValidation.valid) {
      logger.warn('[TEMPLATE_UPDATE] Button validation failed', { templateId: id, error: buttonValidation.error });
      return sendBadRequest(res, buttonValidation.error);
    }

    // Detect schema version
    const schemaVersion = await detectTemplateSchema(db);
    
    let sql, params;
    if (schemaVersion === 'new') {
      // New schema: separate subject_en and subject_lt columns
      sql = `UPDATE templates SET name = ?, subject_en = ?, subject_lt = ?, body_en = ?, body_lt = ?, style = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      params = [name, finalSubjectEn, finalSubjectLt, body_en, body_lt, style, id];
    } else {
      // Old schema: single subject column with JSON
      const subjectJson = JSON.stringify({ en: finalSubjectEn, lt: finalSubjectLt });
      sql = `UPDATE templates SET name = ?, subject = ?, body_en = ?, body_lt = ?, style = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
      params = [name, subjectJson, body_en, body_lt, style, id];
    }
    
    const result = await dbRun(sql, params);
    const changes = result.affectedRows !== undefined ? result.affectedRows : result.changes;
    
    if (changes === 0) {
      return sendNotFound(res, 'Template', req.params.id);
    }

    // Fetch the updated template
    const templateRow = await dbGet('SELECT * FROM templates WHERE id = ?', [id]);
    
    // Parse subject based on schema version
    let subjectEn = '';
    let subjectLt = '';
    if (schemaVersion === 'new') {
      // New schema: direct columns
      subjectEn = templateRow.subject_en || '';
      subjectLt = templateRow.subject_lt || '';
    } else {
      // Old schema: JSON in subject column
      try {
        const subjectData = JSON.parse(templateRow.subject || '{}');
        subjectEn = subjectData.en || templateRow.subject || '';
        subjectLt = subjectData.lt || templateRow.subject || '';
      } catch (e) {
        // Backward compatibility: if subject is not JSON, use it for both
        subjectEn = templateRow.subject || '';
        subjectLt = templateRow.subject || '';
      }
    }
    
    const template = {
      ...templateRow,
      subject: subjectEn, // Keep backward compatibility with 'subject' field
      subject_en: subjectEn,
      subject_lt: subjectLt
    };
    
    res.json({ 
      success: true, 
      template 
    });
  } catch (error) {
    logger.error('Error updating template:', error);
    logger.error('Error details:', { message: error.message, stack: error.stack, name: error.name });
    return sendInternalError(res, error, 'PUT /templates/:id');
  }
});

/**
 * @openapi
 * /templates/{id}:
 *   delete:
 *     summary: Delete a message template
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Template deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '500':
 *         description: Database error
 */
// Delete a template
router.delete('/:id', async (req, res) => {
  const sql = `DELETE FROM templates WHERE id = ?`;
  try {
    await dbRun(sql, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    return sendInternalError(res, err, 'GET /templates');
  }
});

/**
 * @openapi
 * /templates/{id}/preview:
 *   get:
 *     summary: Preview template with sample guest data
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: guestId
 *         schema:
 *           type: integer
 *           description: Guest ID to use for preview (optional)
 *     responses:
 *       '200':
 *         description: Template preview with variables
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 preview:
 *                   type: object
 *                 sampleGuests:
 *                   type: array
 *       '404':
 *         description: Template not found
 *       '500':
 *         description: Server error
 */
// Preview a template with sample data
router.get('/:id/preview', async (req, res) => {
  try {
    const { id } = req.params;
    const { guestId } = req.query;
    
    const templateRow = await dbGet('SELECT * FROM templates WHERE id = ?', [id]);
    if (!templateRow) {
      return sendNotFound(res, 'Template', id);
    }
    
    // Detect schema version
    const schemaVersion = await detectTemplateSchema(db);
    
    // Parse subject based on schema version
    let subjectEn = '';
    let subjectLt = '';
    if (schemaVersion === 'new') {
      // New schema: direct columns
      subjectEn = templateRow.subject_en || '';
      subjectLt = templateRow.subject_lt || '';
    } else {
      // Old schema: JSON in subject column
      try {
        const subjectData = JSON.parse(templateRow.subject || '{}');
        subjectEn = subjectData.en || templateRow.subject || '';
        subjectLt = subjectData.lt || templateRow.subject || '';
      } catch (e) {
        // Backward compatibility: if subject is not JSON, use it for both
        subjectEn = templateRow.subject || '';
        subjectLt = templateRow.subject || '';
      }
    }
    
    // Create normalized template object
    const template = {
      ...templateRow,
      subject: subjectEn, // Keep backward compatibility with 'subject' field
      subject_en: subjectEn,
      subject_lt: subjectLt
    };

    // Get sample guests for preview with all necessary fields
    const sampleGuests = await dbAll(`
      SELECT id, name, email, group_label, preferred_language, rsvp_status, 
             can_bring_plus_one, dietary, notes, code,
             responded_at, attending
      FROM guests 
      WHERE email IS NOT NULL 
      ORDER BY name 
      LIMIT 5
    `);

    // Get variables for template replacement
    let variables = {};
    let selectedGuest = null;
    
    try {
      if (guestId) {
        // Get the specific guest data
        const Guest = require('../db/models/guest');
        selectedGuest = await Guest.findById(guestId);
        if (selectedGuest) {
          // Use guest's preferred language or default to 'en'
          const lang = selectedGuest.preferred_language || 'en';
          variables = await getTemplateVariables(selectedGuest, null, lang);
        } else {
          if (sampleGuests.length > 0) {
            selectedGuest = sampleGuests[0];
            const lang = selectedGuest.preferred_language || 'en';
            variables = await getTemplateVariables(selectedGuest, null, lang);
          }
        }
      } else {
        if (sampleGuests.length > 0) {
          selectedGuest = sampleGuests[0];
          const lang = selectedGuest.preferred_language || 'en';
          variables = await getTemplateVariables(selectedGuest, null, lang);
        }
      }
    } catch (error) {
      logger.error('Error getting variables:', error);
      // Create basic variables as fallback using actual settings
      if (sampleGuests.length > 0) {
        selectedGuest = sampleGuests[0];
        
        // Get actual settings for fallback
        const { getSystemSettings } = require('../utils/templateVariables');
        const getDbConnection = require('../db/connection');
        const db = getDbConnection();
        const settings = await getSystemSettings(db);
        const SITE_URL = process.env.SITE_URL || 'http://localhost:5001';
        
        // Determine if guest is a plus one based on group label
        const isPlusOne = selectedGuest.group_label && selectedGuest.group_label.toLowerCase().includes('plus one');
        
        // Determine if guest can bring plus one (not a plus one themselves and has permission)
        const canBringPlusOne = !isPlusOne && selectedGuest.can_bring_plus_one;
        
        // Format date helper
        
        // Get sender info for fallback
        const { getCachedSenderInfo } = require('../utils/templateVariables');
        const senderInfoString = await getCachedSenderInfo(db);
        let senderName = '';
        let senderEmail = '';
        if (senderInfoString) {
          const match = senderInfoString.match(/^(.+?)\s*<(.+?)>$/);
          if (match) {
            senderName = match[1].trim();
            senderEmail = match[2].trim();
          } else {
            senderName = senderInfoString.trim();
          }
        }
        
        const siteUrl = settings.website_url || SITE_URL;
        const plusOneName = ''; // Will be empty in fallback
        const hasPlusOne = false; // Will be false in fallback
        
        variables = {
          // Guest Properties
          guestName: selectedGuest.name || 'Guest',
          name: selectedGuest.name || 'Guest', // Alias for guestName
          groupLabel: selectedGuest.group_label || 'Guest',
          code: selectedGuest.code || 'ABC123',
          rsvpCode: selectedGuest.code || 'ABC123', // Alias for code
          rsvpLink: `${siteUrl}/${selectedGuest.preferred_language || 'en'}/rsvp/${selectedGuest.code || 'ABC123'}`,
          plusOneName: plusOneName,
          plus_one_name: plusOneName, // Alias for template compatibility
          rsvpDeadline: selectedGuest.rsvp_deadline ? formatRsvpDeadline(selectedGuest.rsvp_deadline) : '',
          email: selectedGuest.email || 'guest@example.com',
          preferredLanguage: selectedGuest.preferred_language || 'en',
          attending: selectedGuest.attending || false,
          rsvp_status: selectedGuest.rsvp_status || 'pending',
          responded_at: selectedGuest.responded_at ? formatDateWithTime(selectedGuest.responded_at) : '',
          can_bring_plus_one: canBringPlusOne,
          dietary: selectedGuest.dietary || '',
          notes: selectedGuest.notes || '',
          
          // Conditional Flags
          hasPlusOne: hasPlusOne,
          has_plus_one: hasPlusOne, // Alias for template compatibility
          isPlusOne: isPlusOne,
          hasResponded: !!selectedGuest.responded_at,
          isAttending: selectedGuest.rsvp_status === 'attending',
          isNotAttending: selectedGuest.rsvp_status === 'not_attending',
          isPending: selectedGuest.rsvp_status === 'pending',
          isBrideFamily: selectedGuest.group_label === 'Bride\'s Family',
          isGroomFamily: selectedGuest.group_label === 'Groom\'s Family',
          isEnglishSpeaker: selectedGuest.preferred_language === 'en',
          isLithuanianSpeaker: selectedGuest.preferred_language === 'lt',
          
          // System Properties
          siteUrl: siteUrl,
          websiteUrl: siteUrl, // Alias for siteUrl
          weddingDate: settings.wedding_date ? formatDateWithoutTime(settings.wedding_date) : '',
          venueName: settings.venue_name || '',
          venueAddress: settings.venue_address || '',
          eventStartDate: settings.event_start_date ? formatDateWithoutTime(settings.event_start_date) : '',
          eventEndDate: settings.event_end_date ? formatDateWithoutTime(settings.event_end_date) : '',
          eventTime: settings.event_time || '',
          brideName: settings.bride_name || '',
          groomName: settings.groom_name || '',
          contactEmail: settings.contact_email || '',
          contactPhone: settings.contact_phone || '',
          rsvpDeadlineDate: settings.rsvp_deadline ? formatDateWithoutTime(settings.rsvp_deadline) : '',
          eventType: settings.event_type || '',
          dressCode: settings.dress_code || '',
          specialInstructions: settings.special_instructions || '',
          appTitle: settings.app_title || 'Wedding Site',
          senderName: senderName,
          senderEmail: senderEmail,
          currentDate: formatDateWithoutTime(new Date().toISOString()),
          daysUntilWedding: settings.wedding_date ? 
            Math.ceil((new Date(settings.wedding_date) - new Date()) / (1000 * 60 * 60 * 24)) + ' days' : ''
        };
      } else {
        variables = {};
      }
    }
    
    // Use unified email generation service for both languages
    const emailDataEn = await generateEmailFromTemplate(
      template,
      selectedGuest,
      { style: template.style || 'elegant', language: 'en' }
    );
    
    const emailDataLt = await generateEmailFromTemplate(
      template,
      selectedGuest,
      { style: template.style || 'elegant', language: 'lt' }
    );

    // Get processed content for preview (body_en and body_lt) - needed for editing view
    const { getEmailContent } = require('../helpers/emailGeneration');
    // Reuse existing variables variable (already declared at line 548)
    // Note: getTemplateVariables and replaceTemplateVars are already imported at top of file
    // Generate variables for both languages
    const variablesEn = await getTemplateVariables(selectedGuest, template, 'en');
    const variablesLt = await getTemplateVariables(selectedGuest, template, 'lt');
    const { body: bodyEn } = await getEmailContent(template, selectedGuest, 'en');
    const { body: bodyLt } = await getEmailContent(template, selectedGuest, 'lt');
    const processedBodyEn = replaceTemplateVars(bodyEn, variablesEn);
    const processedBodyLt = replaceTemplateVars(bodyLt, variablesLt);
    const subject = emailDataEn.subject; // Use subject from generated email

    const response = {
      success: true,
      subject,
      body_en: processedBodyEn, // Keep processed content for preview
      body_lt: processedBodyLt, // Keep processed content for preview
      email_html_en: emailDataEn.html, // Full email HTML for preview
      email_html_lt: emailDataLt.html, // Full email HTML for preview
      style: template.style || 'elegant',
      sampleGuests,
      selectedGuest: selectedGuest ? {
        id: selectedGuest.id,
        name: selectedGuest.name,
        email: selectedGuest.email
      } : null
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error previewing template:', error);
    logger.error('Error stack:', error.stack);
    return sendInternalError(res, error, 'GET /templates/:id/preview');
  }
});

/**
 * @openapi
 * /templates/preview:
 *   post:
 *     summary: Preview an unsaved template with sample data
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - subject_en
 *               - subject_lt
 *               - body_en
 *               - body_lt
 *             properties:
 *               name:
 *                 type: string
 *               subject_en:
 *                 type: string
 *               subject_lt:
 *                 type: string
 *               body_en:
 *                 type: string
 *               body_lt:
 *                 type: string
 *               style:
 *                 type: string
 *                 default: elegant
 *               guestId:
 *                 type: integer
 *     responses:
 *       '200':
 *         description: Preview generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 subject:
 *                   type: string
 *                 body_en:
 *                   type: string
 *                 body_lt:
 *                   type: string
 *                 email_html_en:
 *                   type: string
 *                 email_html_lt:
 *                   type: string
 *                 style:
 *                   type: string
 *                 sampleGuests:
 *                   type: array
 *                 selectedGuest:
 *                   type: object
 *       '500':
 *         description: Server error
 */
// Preview an unsaved template with sample data
router.post('/preview', async (req, res) => {
  try {
    const { name, subject_en, subject_lt, body_en, body_lt, style = 'elegant', guestId } = req.body;
    
    // Validate required fields
    if (!name || !subject_en || !subject_lt || !body_en || !body_lt) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, subject_en, subject_lt, body_en, body_lt'
      });
    }
    
    // Create template object from request data
    const template = {
      id: null, // No ID since it's unsaved
      name,
      subject: subject_en, // Keep backward compatibility
      subject_en,
      subject_lt,
      body_en,
      body_lt,
      style
    };

    // Get sample guests for preview with all necessary fields
    const sampleGuests = await dbAll(`
      SELECT id, name, email, group_label, preferred_language, rsvp_status, 
             can_bring_plus_one, dietary, notes, code,
             responded_at, attending, rsvp_deadline
      FROM guests 
      WHERE email IS NOT NULL 
      ORDER BY name 
      LIMIT 5
    `);

    // Get variables for template replacement
    let variables = {};
    let selectedGuest = null;
    
    try {
      if (guestId) {
        // Get the specific guest data
        const Guest = require('../db/models/guest');
        selectedGuest = await Guest.findById(guestId);
        if (selectedGuest) {
          // Use guest's preferred language or default to 'en'
          const lang = selectedGuest.preferred_language || 'en';
          variables = await getTemplateVariables(selectedGuest, template, lang);
        } else {
          if (sampleGuests.length > 0) {
            selectedGuest = sampleGuests[0];
            const lang = selectedGuest.preferred_language || 'en';
            variables = await getTemplateVariables(selectedGuest, template, lang);
          }
        }
      } else {
        if (sampleGuests.length > 0) {
          selectedGuest = sampleGuests[0];
          const lang = selectedGuest.preferred_language || 'en';
          variables = await getTemplateVariables(selectedGuest, template, lang);
        }
      }
    } catch (error) {
      logger.error('Error getting variables:', error);
      // Create basic variables as fallback using actual settings
      if (sampleGuests.length > 0) {
        selectedGuest = sampleGuests[0];
        
        // Get actual settings for fallback
        const { getSystemSettings } = require('../utils/templateVariables');
        const getDbConnection = require('../db/connection');
        const db = getDbConnection();
        const settings = await getSystemSettings(db);
        const SITE_URL = process.env.SITE_URL || 'http://localhost:5001';
        
        // Determine if guest is a plus one based on group label
        const isPlusOne = selectedGuest.group_label && selectedGuest.group_label.toLowerCase().includes('plus one');
        
        // Determine if guest can bring plus one (not a plus one themselves and has permission)
        const canBringPlusOne = !isPlusOne && selectedGuest.can_bring_plus_one;
        
        // Get sender info for fallback
        const { getCachedSenderInfo } = require('../utils/templateVariables');
        const senderInfoString = await getCachedSenderInfo(db);
        let senderName = '';
        let senderEmail = '';
        if (senderInfoString) {
          const match = senderInfoString.match(/^(.+?)\s*<(.+?)>$/);
          if (match) {
            senderName = match[1].trim();
            senderEmail = match[2].trim();
          } else {
            senderName = senderInfoString.trim();
          }
        }
        
        const siteUrl = settings.website_url || SITE_URL;
        const plusOneName = ''; // Will be empty in fallback
        const hasPlusOne = false; // Will be false in fallback
        
        variables = {
          // Guest Properties
          guestName: selectedGuest.name || 'Guest',
          name: selectedGuest.name || 'Guest', // Alias for guestName
          groupLabel: selectedGuest.group_label || 'Guest',
          code: selectedGuest.code || 'ABC123',
          rsvpCode: selectedGuest.code || 'ABC123', // Alias for code
          rsvpLink: `${siteUrl}/${selectedGuest.preferred_language || 'en'}/rsvp/${selectedGuest.code || 'ABC123'}`,
          plusOneName: plusOneName,
          plus_one_name: plusOneName, // Alias for template compatibility
          rsvpDeadline: selectedGuest.rsvp_deadline ? formatRsvpDeadline(selectedGuest.rsvp_deadline) : '',
          email: selectedGuest.email || 'guest@example.com',
          preferredLanguage: selectedGuest.preferred_language || 'en',
          attending: selectedGuest.attending || false,
          rsvp_status: selectedGuest.rsvp_status || 'pending',
          responded_at: selectedGuest.responded_at ? formatDateWithTime(selectedGuest.responded_at) : '',
          can_bring_plus_one: canBringPlusOne,
          dietary: selectedGuest.dietary || '',
          notes: selectedGuest.notes || '',
          
          // Conditional Flags
          hasPlusOne: hasPlusOne,
          has_plus_one: hasPlusOne, // Alias for template compatibility
          isPlusOne: isPlusOne,
          hasResponded: !!selectedGuest.responded_at,
          isAttending: selectedGuest.rsvp_status === 'attending',
          isNotAttending: selectedGuest.rsvp_status === 'not_attending',
          isPending: selectedGuest.rsvp_status === 'pending',
          isBrideFamily: selectedGuest.group_label === 'Bride\'s Family',
          isGroomFamily: selectedGuest.group_label === 'Groom\'s Family',
          isEnglishSpeaker: selectedGuest.preferred_language === 'en',
          isLithuanianSpeaker: selectedGuest.preferred_language === 'lt',
          
          // System Properties
          siteUrl: siteUrl,
          websiteUrl: siteUrl, // Alias for siteUrl
          weddingDate: settings.wedding_date ? formatDateWithoutTime(settings.wedding_date) : '',
          venueName: settings.venue_name || '',
          venueAddress: settings.venue_address || '',
          eventStartDate: settings.event_start_date ? formatDateWithoutTime(settings.event_start_date) : '',
          eventEndDate: settings.event_end_date ? formatDateWithoutTime(settings.event_end_date) : '',
          eventTime: settings.event_time || '',
          brideName: settings.bride_name || '',
          groomName: settings.groom_name || '',
          contactEmail: settings.contact_email || '',
          contactPhone: settings.contact_phone || '',
          rsvpDeadlineDate: settings.rsvp_deadline ? formatDateWithoutTime(settings.rsvp_deadline) : '',
          eventType: settings.event_type || '',
          dressCode: settings.dress_code || '',
          specialInstructions: settings.special_instructions || '',
          appTitle: settings.app_title || 'Wedding Site',
          senderName: senderName,
          senderEmail: senderEmail,
          currentDate: formatDateWithoutTime(new Date().toISOString()),
          daysUntilWedding: settings.wedding_date ? 
            Math.ceil((new Date(settings.wedding_date) - new Date()) / (1000 * 60 * 60 * 24)) + ' days' : ''
        };
      } else {
        variables = {};
      }
    }
    
    // Use unified email generation service for both languages
    const emailDataEn = await generateEmailFromTemplate(
      template,
      selectedGuest,
      { style: template.style || 'elegant', language: 'en' }
    );
    
    const emailDataLt = await generateEmailFromTemplate(
      template,
      selectedGuest,
      { style: template.style || 'elegant', language: 'lt' }
    );

    // Get processed content for preview (body_en and body_lt) - needed for editing view
    const { getEmailContent } = require('../helpers/emailGeneration');
    // Generate variables for both languages
    const variablesEn = await getTemplateVariables(selectedGuest, template, 'en');
    const variablesLt = await getTemplateVariables(selectedGuest, template, 'lt');
    const { body: bodyEn } = await getEmailContent(template, selectedGuest, 'en');
    const { body: bodyLt } = await getEmailContent(template, selectedGuest, 'lt');
    const processedBodyEn = replaceTemplateVars(bodyEn, variablesEn);
    const processedBodyLt = replaceTemplateVars(bodyLt, variablesLt);
    const subject = emailDataEn.subject; // Use subject from generated email

    const response = {
      success: true,
      subject,
      body_en: processedBodyEn, // Keep processed content for preview
      body_lt: processedBodyLt, // Keep processed content for preview
      email_html_en: emailDataEn.html, // Full email HTML for preview
      email_html_lt: emailDataLt.html, // Full email HTML for preview
      style: template.style || 'elegant',
      sampleGuests,
      selectedGuest: selectedGuest ? {
        id: selectedGuest.id,
        name: selectedGuest.name,
        email: selectedGuest.email
      } : null
    };
    
    res.json(response);
  } catch (error) {
    logger.error('Error previewing unsaved template:', error);
    logger.error('Error stack:', error.stack);
    return sendInternalError(res, error, 'POST /templates/preview');
  }
});

/**
 * @openapi
 * /templates/preview-variables:
 *   get:
 *     summary: Get available template variables and sample data
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: Available variables and sample data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 variables:
 *                   type: object
 *                 sampleGuests:
 *                   type: array
 *                   items:
 *                     type: object
 */
// Get available variables and sample data
router.get('/preview-variables', async (req, res) => {
  try {
    const { getAvailableVariables } = require('../utils/templateVariables');
    const variables = getAvailableVariables();

    // Get sample guests
    const sampleGuests = await dbAll(`
      SELECT id, name, group_label, preferred_language, rsvp_status, can_bring_plus_one
      FROM guests 
      WHERE email IS NOT NULL 
      ORDER BY name 
      LIMIT 10
    `);

    res.json({
      success: true,
      variables,
      sampleGuests,
      conditionalExamples: {
        "{{#if can_bring_plus_one}}...{{/if}}": "Show content only if guest can bring plus one",
        "{{#if plus_one_name}}...{{else}}...{{/if}}": "Show different content based on plus one status",
        "{{#if rsvp_status === 'attending'}}...{{else}}...{{/if}}": "Show content based on RSVP status",
        "{{#if group_label === 'Bride\\'s Family'}}...{{/if}}": "Show content for specific groups"
      }
    });
  } catch (err) {
    logger.error('Error getting preview variables:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add seed templates endpoint
router.post('/seed', async (req, res) => {
  try {
    const { seedTemplates } = require('../scripts/seedTemplates');
    await seedTemplates();
    res.json({ success: true, message: 'Templates seeded successfully' });
  } catch (error) {
    logger.error('Error seeding templates:', error);
    return sendInternalError(res, error, 'POST /templates/seed');
  }
});

module.exports = router;
