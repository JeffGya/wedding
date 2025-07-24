// 20250723220219_add_response_text_to_survey_responses.js
// Add response_text column, migrate data from old `response`, then drop or relax the old column
// so inserts that only set response_text no longer fail.

exports.up = async function (knex) {
    const client = knex.client.config.client;
  
    const hasResponseText = await knex.schema.hasColumn('survey_responses', 'response_text');
    const hasOldResponse = await knex.schema.hasColumn('survey_responses', 'response');
  
    if (!hasResponseText) {
      await knex.schema.alterTable('survey_responses', (t) => {
        // TEXT is fine for both MySQL & SQLite
        t.text('response_text').notNullable().defaultTo('');
      });
    }
  
    // If old response column exists, copy data over then drop or null it out
    if (hasOldResponse) {
      // copy only where response_text is empty
      await knex.raw(`
        UPDATE survey_responses
        SET response_text = COALESCE(response, '')
        WHERE (response_text IS NULL OR response_text = '') AND response IS NOT NULL
      `);
  
      if (client === 'mysql' || client === 'mysql2') {
        // MySQL cannot drop default easily if it's used, so we just drop the column to avoid future conflicts
        await knex.schema.alterTable('survey_responses', (t) => {
          t.dropColumn('response');
        });
      } else {
        // SQLite path: alterTable with dropColumn support in newer knex, else ignore
        await knex.schema.alterTable('survey_responses', (t) => {
          t.dropColumn('response');
        });
      }
    }
  };
  
  exports.down = async function (knex) {
    const client = knex.client.config.client;
  
    const hasResponseText = await knex.schema.hasColumn('survey_responses', 'response_text');
    const hasOldResponse = await knex.schema.hasColumn('survey_responses', 'response');
  
    // Re-create old response column (NOT NULL, default '')
    if (!hasOldResponse) {
      await knex.schema.alterTable('survey_responses', (t) => {
        t.text('response').notNullable().defaultTo('');
      });
    }
  
    // Copy data back
    if (hasResponseText) {
      await knex.raw(`
        UPDATE survey_responses
        SET response = COALESCE(response_text, '')
      `);
    }
  
    // Drop response_text
    if (hasResponseText) {
      await knex.schema.alterTable('survey_responses', (t) => {
        t.dropColumn('response_text');
      });
    }
  };