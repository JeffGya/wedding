/**
 * Template Schema Detection Utility
 * Centralized logic for detecting template schema version (new vs old)
 * Maintains caching behavior for performance
 */

const logger = require('../helpers/logger');
const getDbConnection = require('../db/connection');
const { createDbHelpers } = require('../db/queryHelpers');

// Schema version cache (shared across all calls)
let schemaVersionCache = null;

/**
 * Detect template schema version (new with subject_en/subject_lt or old with JSON subject)
 * @param {Object} [db] - Optional database connection (will create if not provided)
 * @returns {Promise<string>} 'new' or 'old'
 */
async function detectTemplateSchema(db = null) {
  // Use cached version if available
  if (schemaVersionCache !== null) {
    return schemaVersionCache;
  }
  
  // Get database connection if not provided
  const dbConnection = db || getDbConnection();
  const { dbGet } = createDbHelpers(dbConnection);

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
    logger.warn('[TEMPLATE_SCHEMA] Detection failed, defaulting to old schema', { error: error.message });
    schemaVersionCache = 'old';
    return schemaVersionCache;
  }
}

/**
 * Clear the schema version cache (useful for testing or after schema migrations)
 */
function clearSchemaCache() {
  schemaVersionCache = null;
}

module.exports = {
  detectTemplateSchema,
  clearSchemaCache
};

