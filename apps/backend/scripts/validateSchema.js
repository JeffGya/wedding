require('dotenv').config();
const mysql = require('mysql2/promise');

// Define what your application ACTUALLY uses (based on real code analysis)
const EXPECTED_SCHEMA = {
  users: ['id', 'name', 'email', 'passwordHash'],
  settings: ['id', 'enable_global_countdown', 'wedding_date', 'venue_name', 'venue_address', 'event_start_date', 'event_end_date', 'event_time', 'bride_name', 'groom_name', 'contact_email', 'contact_phone', 'event_type', 'dress_code', 'special_instructions', 'website_url', 'app_title'],
  page_translations: ['id', 'page_id', 'locale', 'title', 'content', 'deleted_at', 'created_at', 'updated_at'],
  survey_blocks: ['id', 'page_id', 'locale', 'type', 'question', 'options', 'is_required', 'is_anonymous', 'requires_rsvp', 'block_order', 'deleted_at', 'created_at', 'updated_at'],
  templates: ['id', 'name', 'subject', 'body_en', 'body_lt', 'style', 'created_at', 'updated_at'],
  email_settings: ['id', 'provider', 'api_key', 'from_name', 'from_email', 'enabled', 'sender_name', 'sender_email', 'created_at', 'updated_at'],
  pages: ['id', 'slug', 'title_en', 'title_lt', 'content_en', 'content_lt', 'meta_description_en', 'meta_description_lt', 'is_published', 'show_in_nav', 'nav_order', 'requires_rsvp', 'created_at', 'updated_at', 'deleted_at'],
  guests: ['id', 'group_id', 'group_label', 'name', 'preferred_language', 'email', 'code', 'can_bring_plus_one', 'is_primary', 'attending', 'rsvp_deadline', 'dietary', 'notes', 'rsvp_status', 'responded_at', 'created_at', 'updated_at'],
  images: ['id', 'filename', 'original_name', 'mime_type', 'size', 'path', 'alt_text', 'created_at', 'updated_at'],
  messages: ['id', 'subject', 'body_en', 'body_lt', 'status', 'scheduled_for', 'style', 'created_at', 'updated_at'],
  message_recipients: ['id', 'message_id', 'guest_id', 'email', 'language', 'delivery_status', 'delivery_error', 'status', 'error_message', 'sent_at', 'created_at', 'resend_message_id', 'updated_at'],
  survey_responses: ['id', 'survey_block_id', 'guest_id', 'response_data', 'response_text', 'created_at', 'updated_at'],
  guest_settings: ['id', 'rsvp_open', 'rsvp_deadline', 'created_at', 'updated_at']
};

async function validateSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  const logger = require('../helpers/logger');
  logger.info('🔍 Validating database schema...');

  let hasErrors = false;

  for (const [tableName, expectedColumns] of Object.entries(EXPECTED_SCHEMA)) {
    try {
      // Get actual table structure
      const [rows] = await connection.execute(`DESCRIBE ${tableName}`);
      const actualColumns = rows.map(row => row.Field);
      
      // Check for missing columns
      const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
      const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
      
      if (missingColumns.length > 0) {
        logger.error(`❌ Table '${tableName}' missing columns: ${missingColumns.join(', ')}`);
        hasErrors = true;
      }
      
      if (extraColumns.length > 0) {
        logger.warn(`⚠️  Table '${tableName}' has extra columns: ${extraColumns.join(', ')}`);
      }
      
      if (missingColumns.length === 0 && extraColumns.length === 0) {
        logger.info(`✅ Table '${tableName}' schema matches expectations`);
      }
      
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') {
        logger.error(`❌ Table '${tableName}' does not exist`);
        hasErrors = true;
      } else {
        logger.error(`❌ Error checking table '${tableName}': ${error.message}`);
        hasErrors = true;
      }
    }
  }

  await connection.end();
  
  if (hasErrors) {
    logger.error('❌ Schema validation failed - database is out of sync with application');
    process.exit(1);
  } else {
    logger.info('✅ Schema validation passed - database is fully aligned with application');
  }
}

validateSchema().catch(err => {
  console.error('❌ Validation failed:', err);
  process.exit(1);
});
