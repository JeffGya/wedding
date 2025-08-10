require('dotenv').config();
const fs = require('fs');
const path = require('path');

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

function parseBaselineSchema(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const tables = {};
    
    // Extract CREATE TABLE statements - FIXED REGEX
    const createTableRegex = /CREATE TABLE `([^`]+)`\s*\(([\s\S]*?)\)\s*ENGINE/gi;
    let match;
    
    while ((match = createTableRegex.exec(content)) !== null) {
      const tableName = match[1];
      const tableBody = match[2];
      
      // Extract column definitions - FIXED REGEX
      const columnRegex = /`([^`]+)`\s+([^,\n\r]+)/gi;
      const columns = [];
      let columnMatch;
      
      while ((columnMatch = columnRegex.exec(tableBody)) !== null) {
        columns.push(columnMatch[1]);
      }
      
      tables[tableName] = columns;
    }
    
    return tables;
  } catch (error) {
    console.error(`❌ Error reading baseline schema file: ${error.message}`);
    return {};
  }
}

function validateBaselineSchema() {
  const baselinePath = path.join(__dirname, '../migrations/mysql_baseline_schema.sql');
  
  if (!fs.existsSync(baselinePath)) {
    console.error(`❌ Baseline schema file not found: ${baselinePath}`);
    return;
  }
  
  console.log('🔍 VALIDATING BASELINE SCHEMA vs APPLICATION EXPECTATIONS:\n');
  
  const baselineTables = parseBaselineSchema(baselinePath);
  let hasErrors = false;
  
  for (const [tableName, expectedColumns] of Object.entries(EXPECTED_SCHEMA)) {
    console.log(`�� Table: ${tableName}`);
    
    if (!baselineTables[tableName]) {
      console.error(`  ❌ Table not found in baseline schema`);
      hasErrors = true;
      continue;
    }
    
    const baselineColumns = baselineTables[tableName];
    
    // Check for missing columns
    const missingColumns = expectedColumns.filter(col => !baselineColumns.includes(col));
    const extraColumns = baselineColumns.filter(col => !expectedColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.error(`  ❌ Missing columns: ${missingColumns.join(', ')}`);
      hasErrors = true;
    }
    
    if (extraColumns.length > 0) {
      console.warn(`  ⚠️  Extra columns: ${extraColumns.join(', ')}`);
    }
    
    if (missingColumns.length === 0 && extraColumns.length === 0) {
      console.log(`  ✅ Schema matches application expectations`);
    }
    
    console.log('');
  }
  
  if (hasErrors) {
    console.error('❌ Baseline schema validation failed - missing required columns');
    console.log('\n💡 To fix this, update mysql_baseline_schema.sql to include all missing columns');
  } else {
    console.log('✅ Baseline schema validation passed - all required columns present');
  }
}

validateBaselineSchema();
