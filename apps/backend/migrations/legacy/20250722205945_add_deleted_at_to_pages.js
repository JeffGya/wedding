// apps/backend/migrations/20250722120000_add_deleted_at_to_pages.js
/**
 * Adds `deleted_at` column for soft deletes on `pages`.
 * Works for both MySQL (mysql2) and SQLite.
 */
exports.up = async function up(knex) {
    const hasCol = await knex.schema.hasColumn('pages', 'deleted_at');
    if (hasCol) return;
  
    await knex.schema.alterTable('pages', (table) => {
      table.dateTime('deleted_at').nullable().defaultTo(null);
    });
  
    // Try to add an index (ignore if unsupported / already exists)
    try {
      // MySQL / Postgres syntax
      await knex.schema.raw('CREATE INDEX idx_pages_deleted_at ON pages (deleted_at)');
    } catch (_) {
      try {
        // SQLite syntax
        await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_pages_deleted_at ON pages (deleted_at)');
      } catch (_) {}
    }
  };
  
  exports.down = async function down(knex) {
    const hasCol = await knex.schema.hasColumn('pages', 'deleted_at');
    if (!hasCol) return;
  
    // Drop index if possible (dialect differences handled with try/catch)
    try {
      await knex.schema.raw('DROP INDEX idx_pages_deleted_at ON pages');
    } catch (_) {
      try {
        await knex.schema.raw('DROP INDEX IF EXISTS idx_pages_deleted_at');
      } catch (_) {}
    }
  
    // SQLite can't drop columns easily; wrap in try/catch
    try {
      await knex.schema.alterTable('pages', (table) => {
        table.dropColumn('deleted_at');
      });
    } catch (err) {
      // If you're on SQLite, dropping a column is non-trivial. You can ignore or implement a rebuild.
      const logger = require('../../helpers/logger');
      logger.warn('Could not drop column deleted_at (likely SQLite). Skipping.', err.message);
    }
  };