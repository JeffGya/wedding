// apps/backend/migrations/20250722121500_add_deleted_at_to_page_translations.js
exports.up = async function up(knex) {
    const hasCol = await knex.schema.hasColumn('page_translations', 'deleted_at');
    if (hasCol) return;
  
    await knex.schema.alterTable('page_translations', (table) => {
      table.dateTime('deleted_at').nullable().defaultTo(null);
    });
  
    try {
      await knex.schema.raw('CREATE INDEX idx_page_translations_deleted_at ON page_translations (deleted_at)');
    } catch (_) {
      try {
        await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_page_translations_deleted_at ON page_translations (deleted_at)');
      } catch (_) {}
    }
  };
  
  exports.down = async function down(knex) {
    const hasCol = await knex.schema.hasColumn('page_translations', 'deleted_at');
    if (!hasCol) return;
  
    try {
      await knex.schema.raw('DROP INDEX idx_page_translations_deleted_at ON page_translations');
    } catch (_) {
      try {
        await knex.schema.raw('DROP INDEX IF EXISTS idx_page_translations_deleted_at');
      } catch (_) {}
    }
  
    try {
      await knex.schema.alterTable('page_translations', (table) => {
        table.dropColumn('deleted_at');
      });
    } catch (err) {
      const logger = require('../../helpers/logger');
      logger.warn('Could not drop deleted_at (likely SQLite). Skipping.', err.message);
    }
  };