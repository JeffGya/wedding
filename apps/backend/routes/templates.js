const express = require('express');
const router = express.Router();
const getDbConnection = require('../db/connection');
const db = getDbConnection();
const { getTemplateVariables, replaceTemplateVars } = require('../utils/templateVariables');

let dbGet, dbAll, dbRun;
if (process.env.DB_TYPE === 'mysql') {
  dbGet = async (sql, params) => {
    const [rows] = await db.query(sql, params);
    return rows[0];
  };
  dbAll = async (sql, params) => {
    const [rows] = await db.query(sql, params);
    return rows;
  };
  dbRun = async (sql, params) => {
    const [result] = await db.query(sql, params);
    return result;
  };
} else {
  const sqlite3 = require('sqlite3').verbose();
  const util = require('util');
  dbGet = util.promisify(db.get.bind(db));
  dbAll = util.promisify(db.all.bind(db));
  dbRun = util.promisify(db.run.bind(db));
}

const requireAuth = require('../middleware/auth');
const { generateEmailHTML, generateButtonHTML, getAvailableStyles } = require('../utils/emailTemplates');
const logger = require('../helpers/logger');

// Helper function to detect template schema version
let schemaVersionCache = null;
async function detectTemplateSchema() {
  if (schemaVersionCache !== null) return schemaVersionCache;
  
  try {
    // Try to fetch a template and check which columns exist
    // This is more reliable than querying INFORMATION_SCHEMA
    const testTemplate = await dbGet('SELECT * FROM templates LIMIT 1', []);
    
    if (testTemplate) {
      const hasSubjectEn = 'subject_en' in testTemplate;
      schemaVersionCache = hasSubjectEn ? 'new' : 'old';
      return schemaVersionCache;
    } else {
      // No templates exist, check schema directly
      let checkSql;
      if (process.env.DB_TYPE === 'mysql') {
        checkSql = `SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'templates' AND COLUMN_NAME = 'subject_en'`;
      } else {
        checkSql = `SELECT COUNT(*) as count FROM pragma_table_info('templates') WHERE name = 'subject_en'`;
      }
      
      const result = await dbGet(checkSql, []);
      const hasSubjectEn = (result?.count || 0) > 0;
      
      schemaVersionCache = hasSubjectEn ? 'new' : 'old';
      return schemaVersionCache;
    }
  } catch (error) {
    // Default to old schema if detection fails
    schemaVersionCache = 'old';
    return schemaVersionCache;
  }
}

// Protect all routes
router.use(requireAuth);

// Debug log for all requests to this route
router.use((req, res, next) => {
  logger.debug('✅ Auth passed, hitting template route:', req.method, req.originalUrl);
  next();
});

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
    const schemaVersion = await detectTemplateSchema();
    
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
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Add route to get available template styles - MUST BE BEFORE /:id route
router.get('/styles', async (req, res) => {
  try {
    logger.debug('🔍 Fetching template styles...');
    
    // Use the already imported function instead of requiring it again
    const styles = getAvailableStyles();
    
    logger.debug('📋 Available styles:', JSON.stringify(styles, null, 2));
    
    const response = {
      success: true,
      styles
    };
    
    logger.debug('📤 Sending response');
    res.json(response);
    logger.debug('✅ Response sent successfully');
  } catch (error) {
    logger.error('❌ Error fetching template styles:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch template styles: ' + error.message 
    });
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
    if (!row) return res.status(404).json({ success: false, error: 'Template not found' });
    
    // Detect schema version
    const schemaVersion = await detectTemplateSchema();
    
    // Parse subject based on schema version
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
    
    const template = {
      ...row,
      subject: subjectEn, // Keep backward compatibility with 'subject' field
      subject_en: subjectEn,
      subject_lt: subjectLt
    };
    res.json({ success: true, template });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
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
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid template style',
          availableStyles: availableStyles.map(s => ({ key: s.key, name: s.name }))
        });
      }
    }
    
    // Support both 'subject' (backward compatibility) and 'subject_en'/'subject_lt'
    const finalSubjectEn = subject_en || subject || '';
    const finalSubjectLt = subject_lt || subject || '';
    
    logger.debug('Creating template with data:', { name, subject_en: finalSubjectEn, subject_lt: finalSubjectLt, body_en: body_en?.substring(0, 50), body_lt: body_lt?.substring(0, 50), style });
    
    if (!name || !finalSubjectEn || !body_en || !body_lt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, subject (or subject_en), body_en, and body_lt are required.' 
      });
    }

    // Detect schema version
    const schemaVersion = await detectTemplateSchema();
    
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
    
    logger.debug('Inserting template with SQL:', sql);
    logger.debug('Parameters:', params);
    
    const result = await dbRun(sql, params);
    const templateId = result.insertId || result.lastID;
    
    logger.debug('Template created with ID:', templateId);

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
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create template',
      details: error.message
    });
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
    
    // Support both 'subject' (backward compatibility) and 'subject_en'/'subject_lt'
    const finalSubjectEn = subject_en || subject || '';
    const finalSubjectLt = subject_lt || subject || '';
    
    if (!name || !finalSubjectEn || !body_en || !body_lt) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, subject (or subject_en), body_en, and body_lt are required.' 
      });
    }

    // Detect schema version
    const schemaVersion = await detectTemplateSchema();
    
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
      return res.status(404).json({ 
        success: false, 
        error: 'Template not found' 
      });
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
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update template: ' + error.message 
    });
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
    return res.status(500).json({ success: false, error: err.message });
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
    
    logger.debug('Preview request:', { id, guestId });
    
    const templateRow = await dbGet('SELECT * FROM templates WHERE id = ?', [id]);
    if (!templateRow) {
      logger.debug('Template not found for ID:', id);
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    logger.debug('Template found:', templateRow.name);
    
    // Detect schema version
    const schemaVersion = await detectTemplateSchema();
    
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

    logger.debug('Sample guests found:', sampleGuests.length);

    // Get variables for template replacement
    let variables = {};
    let selectedGuest = null;
    
    try {
      if (guestId) {
        logger.debug('Getting variables for specific guest:', guestId);
        // Get the specific guest data
        selectedGuest = await dbGet('SELECT * FROM guests WHERE id = ?', [guestId]);
        if (selectedGuest) {
          logger.debug('Found specific guest:', selectedGuest.name);
          variables = await getTemplateVariables(selectedGuest);
        } else {
          logger.debug('Guest not found, using first sample guest');
          if (sampleGuests.length > 0) {
            selectedGuest = sampleGuests[0];
            variables = await getTemplateVariables(selectedGuest);
          }
        }
      } else {
        logger.debug('Getting variables for first sample guest');
        if (sampleGuests.length > 0) {
          selectedGuest = sampleGuests[0];
          variables = await getTemplateVariables(selectedGuest);
        }
      }
    } catch (error) {
      logger.error('Error getting variables:', error);
      // Create basic variables as fallback
      if (sampleGuests.length > 0) {
        selectedGuest = sampleGuests[0];
        
        // Determine if guest is a plus one based on group label
        const isPlusOne = selectedGuest.group_label && selectedGuest.group_label.toLowerCase().includes('plus one');
        
        // Determine if guest can bring plus one (not a plus one themselves and has permission)
        const canBringPlusOne = !isPlusOne && selectedGuest.can_bring_plus_one;
        
        variables = {
          guestName: selectedGuest.name || 'Guest',
          groupLabel: selectedGuest.group_label || 'Guest',
          code: selectedGuest.code || 'ABC123',
          rsvpLink: 'https://your-wedding-site.com/en/rsvp/ABC123',
          plusOneName: '', // Plus one name would be stored separately or in notes
          rsvpDeadline: 'December 1, 2025',
          email: selectedGuest.email || 'guest@example.com',
          preferredLanguage: selectedGuest.preferred_language || 'en',
          attending: selectedGuest.attending || false,
          rsvp_status: selectedGuest.rsvp_status || 'pending',
          responded_at: selectedGuest.responded_at || null,
          can_bring_plus_one: canBringPlusOne,
          dietary: selectedGuest.dietary || '',
          notes: selectedGuest.notes || '',
          hasPlusOne: false, // This would be determined by checking if they've added a plus one
          isPlusOne: isPlusOne, // New variable to indicate if this guest is a plus one
          hasResponded: !!selectedGuest.responded_at,
          isAttending: selectedGuest.rsvp_status === 'attending',
          isNotAttending: selectedGuest.rsvp_status === 'not_attending',
          isPending: selectedGuest.rsvp_status === 'pending',
          isBrideFamily: selectedGuest.group_label === 'Bride\'s Family',
          isGroomFamily: selectedGuest.group_label === 'Groom\'s Family',
          isEnglishSpeaker: selectedGuest.preferred_language === 'en',
          isLithuanianSpeaker: selectedGuest.preferred_language === 'lt',
          siteUrl: process.env.SITE_URL || 'http://localhost:5001',
          weddingDate: 'June 25, 2025',
          venueName: 'Grand Hall',
          venueAddress: '123 Main Street, Vilnius',
          eventStartDate: 'June 25, 2025',
          eventEndDate: 'June 25, 2025',
          eventTime: '5:00 PM',
          brideName: 'Brigtia',
          groomName: 'Jeffrey',
          contactEmail: 'contact@wedding.com',
          contactPhone: '+370 123 45678',
          rsvpDeadlineDate: 'December 1, 2025',
          eventType: 'Wedding',
          dressCode: 'Semi-formal',
          specialInstructions: '',
          websiteUrl: 'https://your-wedding-site.com',
          appTitle: 'Wedding Site',
          senderName: 'Brigtia & Jeffrey',
          senderEmail: 'noreply@wedding.com',
          currentDate: new Date().toLocaleDateString(),
          daysUntilWedding: '180 days'
        };
      } else {
        variables = {};
      }
    }
    
    logger.debug('Selected guest for preview:', selectedGuest?.name);
    logger.debug('Variables prepared:', Object.keys(variables));
    logger.debug('Sample variables:', {
      guestName: variables.guestName,
      groupLabel: variables.groupLabel,
      rsvp_status: variables.rsvp_status,
      isPlusOne: variables.isPlusOne,
      canBringPlusOne: variables.can_bring_plus_one,
      isAttending: variables.isAttending
    });
    
    // Replace variables in template content
    const bodyEn = replaceTemplateVars(template.body_en || '', variables);
    const bodyLt = replaceTemplateVars(template.body_lt || '', variables);
    // Use subject_en for English, fallback to subject_lt or empty string
    const subject = replaceTemplateVars(template.subject_en || template.subject_lt || '', variables);

    logger.debug('Variable replacement results:');
    logger.debug('Original subject_en:', template.subject_en);
    logger.debug('Original subject_lt:', template.subject_lt);
    logger.debug('Replaced subject:', subject);
    logger.debug('Original body_en length:', template.body_en?.length);
    logger.debug('Replaced body_en length:', bodyEn?.length);

    // Use the new email template system for previews
    const { generateEmailHTML } = require('../utils/emailTemplates');
    
    const style = template.style || 'elegant';
    const previewOptions = {
      title: 'Brigtia & Jeffrey',
      buttonText: 'Visit Our Website',
      buttonUrl: 'https://your-wedding-site.com',
      footerText: 'With love and joy,',
      siteUrl: 'https://your-wedding-site.com'
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
    
    logger.debug('Preview response prepared with style:', response.style);
    res.json(response);
  } catch (error) {
    logger.error('Error previewing template:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({ success: false, error: 'Failed to preview template: ' + error.message });
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
    res.status(500).json({ success: false, error: 'Failed to seed templates' });
  }
});

module.exports = router;
