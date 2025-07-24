// apps/backend/schema/migrations/20250716172624_populate_message_recipients_updated_at.js

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
 * This has been disabled to avoid violating NOT NULL constraint in MySQL.
 */
exports.down = function(knex) {
  return Promise.resolve(); // No-op to avoid constraint violation
};