exports.up = async function (knex) {
    const hasCol = await knex.schema.hasColumn('survey_blocks', 'block_order');
    if (!hasCol) {
      await knex.schema.alterTable('survey_blocks', (t) => {
        t.integer('block_order').notNullable().defaultTo(0);
      });
    }
  };
  
  exports.down = async function (knex) {
    const hasCol = await knex.schema.hasColumn('survey_blocks', 'block_order');
    if (hasCol) {
      await knex.schema.alterTable('survey_blocks', (t) => {
        t.dropColumn('block_order');
      });
    }
  };