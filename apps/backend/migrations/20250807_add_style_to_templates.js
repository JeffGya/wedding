/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const exists = await knex.schema.hasColumn('templates', 'style');
  if (!exists) {
    await knex.schema.table('templates', t => {
      t.enu('style', ['elegant', 'modern', 'friendly']).defaultTo('elegant');
    });
  }
};
exports.down = async function(knex) {
  const exists = await knex.schema.hasColumn('templates', 'style');
  if (exists) {
    await knex.schema.table('templates', t => t.dropColumn('style'));
  }
};


