/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const exists = await knex.schema.hasColumn('pages', 'header_image_url');
  if (!exists) {
    await knex.schema.table('pages', t => {
      t.string('header_image_url', 500).nullable();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const exists = await knex.schema.hasColumn('pages', 'header_image_url');
  if (exists) {
    await knex.schema.table('pages', t => t.dropColumn('header_image_url'));
  }
};
