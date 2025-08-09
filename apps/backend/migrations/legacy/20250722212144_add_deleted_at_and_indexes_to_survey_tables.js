// apps/backend/migrations/20250722124000_add_deleted_at_and_indexes_to_survey_tables.js
/**
 * Adds soft-delete support and useful columns/indexes to survey tables.
 * - survey_blocks:   deleted_at
 * - survey_responses: deleted_at, responded_at (if missing)
 */
exports.up = async function up(knex) {
    // ---- survey_blocks ----
    const hasDeletedBlocks = await knex.schema.hasColumn('survey_blocks', 'deleted_at');
    if (!hasDeletedBlocks) {
      await knex.schema.alterTable('survey_blocks', (table) => {
        table.dateTime('deleted_at').nullable().defaultTo(null);
      });
      try {
        await knex.schema.raw('CREATE INDEX idx_survey_blocks_deleted_at ON survey_blocks (deleted_at)');
      } catch (_) {
        try {
          await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_survey_blocks_deleted_at ON survey_blocks (deleted_at)');
        } catch (_) {}
      }
    }
  
    // ---- survey_responses ----
    const hasDeletedResp = await knex.schema.hasColumn('survey_responses', 'deleted_at');
    const hasRespondedAt = await knex.schema.hasColumn('survey_responses', 'responded_at');
  
    if (!hasDeletedResp || !hasRespondedAt) {
      await knex.schema.alterTable('survey_responses', (table) => {
        if (!hasDeletedResp) table.dateTime('deleted_at').nullable().defaultTo(null);
        if (!hasRespondedAt) table.dateTime('responded_at').nullable().defaultTo(knex.fn.now());
      });
    }
  
    // Helpful indexes (ignore errors if driver doesn't support / already exists)
    try {
      await knex.schema.raw('CREATE INDEX idx_survey_responses_block_id ON survey_responses (survey_block_id)');
    } catch (_) {}
  
    try {
      await knex.schema.raw('CREATE INDEX idx_survey_responses_guest_id ON survey_responses (guest_id)');
    } catch (_) {}
  
    try {
      await knex.schema.raw('CREATE INDEX idx_survey_responses_deleted_at ON survey_responses (deleted_at)');
    } catch (_) {
      try {
        await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_survey_responses_deleted_at ON survey_responses (deleted_at)');
      } catch (_) {}
    }
  };
  
  exports.down = async function down(knex) {
    // Drop indexes first where possible; wrap in try/catch for dialect differences
    try { await knex.schema.raw('DROP INDEX idx_survey_blocks_deleted_at ON survey_blocks'); } catch (_) {
      try { await knex.schema.raw('DROP INDEX IF EXISTS idx_survey_blocks_deleted_at'); } catch (_) {}
    }
    try { await knex.schema.raw('DROP INDEX idx_survey_responses_block_id ON survey_responses'); } catch (_) {}
    try { await knex.schema.raw('DROP INDEX idx_survey_responses_guest_id ON survey_responses'); } catch (_) {}
    try { await knex.schema.raw('DROP INDEX idx_survey_responses_deleted_at ON survey_responses'); } catch (_) {
      try { await knex.schema.raw('DROP INDEX IF EXISTS idx_survey_responses_deleted_at'); } catch (_) {}
    }
  
    // Remove columns (SQLite will likely skip this; acceptable for down)
    try {
      await knex.schema.alterTable('survey_blocks', (table) => {
        table.dropColumn('deleted_at');
      });
    } catch (err) {
      const logger = require('../../helpers/logger');
      logger.warn('SQLite cannot drop survey_blocks.deleted_at easily; skipping.', err.message);
    }
  
    try {
      await knex.schema.alterTable('survey_responses', (table) => {
        table.dropColumn('deleted_at');
        table.dropColumn('responded_at');
      });
    } catch (err) {
      const logger = require('../../helpers/logger');
      logger.warn('SQLite cannot drop survey_responses columns easily; skipping.', err.message);
    }
  };