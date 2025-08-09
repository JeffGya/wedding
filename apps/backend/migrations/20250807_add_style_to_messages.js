exports.up = async function(knex) {
  const exists = await knex.schema.hasColumn('messages', 'style');
  if (!exists) {
    await knex.schema.table('messages', t => {
      t.enu('style', ['elegant', 'modern', 'friendly']).defaultTo('elegant');
    });
  }
};
exports.down = async function(knex) {
  const exists = await knex.schema.hasColumn('messages', 'style');
  if (exists) {
    await knex.schema.table('messages', t => t.dropColumn('style'));
  }
};


