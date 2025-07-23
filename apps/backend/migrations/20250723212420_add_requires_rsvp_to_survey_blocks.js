// 20250723191500_add_requires_rsvp_to_survey_blocks.js
exports.up = async function (knex) {
    const hasColumn = await knex.schema.hasColumn('survey_blocks', 'requires_rsvp');
    if (!hasColumn) {
      await knex.schema.alterTable('survey_blocks', (t) => {
        t.boolean('requires_rsvp').notNullable().defaultTo(false);
      });
    }
  };
  
  exports.down = async function (knex) {
    const hasColumn = await knex.schema.hasColumn('survey_blocks', 'requires_rsvp');
    if (hasColumn) {
      await knex.schema.alterTable('survey_blocks', (t) => {
        t.dropColumn('requires_rsvp');
      });
    }
  };