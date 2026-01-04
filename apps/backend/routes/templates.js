const express = require('express');
const router = express.Router();
const getDbConnection = require('../db/connection');
const { createDbHelpers } = require('../db/queryHelpers');
const db = getDbConnection();
const { dbGet, dbAll, dbRun } = createDbHelpers(db);
const { getTemplateVariables, replaceTemplateVars } = require('../utils/templateVariables');
const { detectTemplateSchema } = require('../utils/templateSchema');
const { formatDateWithoutTime } = require('../utils/dateFormatter');
const { resolveTemplateSubject, normalizeTemplateSubjects } = require('../utils/subjectResolver');

const requireAuth = require('../middleware/auth');
const { generateEmailHTML, generateButtonHTML, getAvailableStyles } = require('../utils/emailTemplates');
const { sendBadRequest, sendNotFound, sendInternalError } = require('../utils/errorHandler');
const logger = require('../helpers/logger');

// Protect all routes
router.use(requireAuth);


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
        selectedGuest = await dbGet('SELECT * FROM guests WHERE id = ?', [guestId]);
        if (selectedGuest) {
          variables = await getTemplateVariables(selectedGuest);
        } else {
          if (sampleGuests.length > 0) {
            selectedGuest = sampleGuests[0];
            variables = await getTemplateVariables(selectedGuest);
          }
        }
      } else {
        if (sampleGuests.length > 0) {
          selectedGuest = sampleGuests[0];
          variables = await getTemplateVariables(selectedGuest);
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
        
        variables = {
          guestName: selectedGuest.name || 'Guest',
          groupLabel: selectedGuest.group_label || 'Guest',
          code: selectedGuest.code || 'ABC123',
          rsvpLink: `${settings.website_url || SITE_URL}/${selectedGuest.preferred_language || 'en'}/rsvp/${selectedGuest.code || 'ABC123'}`,
          plusOneName: '',
          rsvpDeadline: selectedGuest.rsvp_deadline ? formatDateWithoutTime(selectedGuest.rsvp_deadline) : '',
          email: selectedGuest.email || 'guest@example.com',
          preferredLanguage: selectedGuest.preferred_language || 'en',
          attending: selectedGuest.attending || false,
          rsvp_status: selectedGuest.rsvp_status || 'pending',
          responded_at: selectedGuest.responded_at || null,
          can_bring_plus_one: canBringPlusOne,
          dietary: selectedGuest.dietary || '',
          notes: selectedGuest.notes || '',
          hasPlusOne: false,
          isPlusOne: isPlusOne,
          hasResponded: !!selectedGuest.responded_at,
          isAttending: selectedGuest.rsvp_status === 'attending',
          isNotAttending: selectedGuest.rsvp_status === 'not_attending',
          isPending: selectedGuest.rsvp_status === 'pending',
          isBrideFamily: selectedGuest.group_label === 'Bride\'s Family',
          isGroomFamily: selectedGuest.group_label === 'Groom\'s Family',
          isEnglishSpeaker: selectedGuest.preferred_language === 'en',
          isLithuanianSpeaker: selectedGuest.preferred_language === 'lt',
          siteUrl: SITE_URL,
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
          websiteUrl: settings.website_url || SITE_URL,
          appTitle: settings.app_title || 'Wedding Site',
          senderName: '',
          senderEmail: '',
          currentDate: new Date().toLocaleDateString(),
          daysUntilWedding: settings.wedding_date ? 
            Math.ceil((new Date(settings.wedding_date) - new Date()) / (1000 * 60 * 60 * 24)) + ' days' : ''
        };
      } else {
        variables = {};
      }
    }
    
    // Replace variables in template content
    const bodyEn = replaceTemplateVars(template.body_en || '', variables);
    const bodyLt = replaceTemplateVars(template.body_lt || '', variables);
    // Resolve subject with fallback logic (use English as default for preview)
    const subjectTemplate = resolveTemplateSubject(template, 'en', { context: 'template_preview' });
    const subject = replaceTemplateVars(subjectTemplate, variables);

    // Use the new email template system for previews
    const { generateEmailHTML } = require('../utils/emailTemplates');
    
    const style = template.style || 'elegant';
    const previewOptions = {
      title: variables.brideName && variables.groomName 
        ? `${variables.brideName} & ${variables.groomName}`
        : 'Brigita & Jeffrey',
      buttonText: 'Visit Our Website',
      buttonUrl: variables.websiteUrl || variables.siteUrl || 'https://your-wedding-site.com',
      footerText: 'With love and joy,',
      siteUrl: variables.websiteUrl || variables.siteUrl || 'https://your-wedding-site.com'
    };

    // Generate full email HTML for both languages
    const emailHtmlEn = generateEmailHTML(bodyEn, style, previewOptions);
    const emailHtmlLt = generateEmailHTML(bodyLt, style, previewOptions);

    const response = {
      success: true,
      subject,
      body_en: bodyEn, // Keep raw content for editing
      body_lt: bodyLt, // Keep raw content for editing
      email_html_en: emailHtmlEn, // Full email HTML for preview
      email_html_lt: emailHtmlLt, // Full email HTML for preview
      style,
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
