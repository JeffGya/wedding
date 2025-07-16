// apps/backend/schema/migrations/<timestamp>_populate_message_recipients_updated_at.js

/**
 * Populate existing message_recipients.updated_at with created_at if null
 */
exports.up = function(knex) {
    return knex.raw(`
      UPDATE message_recipients
        SET updated_at = created_at
        WHERE updated_at IS NULL;
    `);
  };
  
  /**
   * (Optional) roll back by clearing any updated_at you just back-filled.
   */
  exports.down = function(knex) {
    return knex.raw(`
      UPDATE message_recipients
        SET updated_at = NULL
        WHERE updated_at = created_at;
    `);
  };