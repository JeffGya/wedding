/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const already = await knex.schema.hasColumn('settings', 'venue_name');
  if (already) return; // assume whole set exists

  await knex.schema.alterTable('settings', function(table) {
    table.string('venue_name', 255).nullable();
    table.text('venue_address').nullable();
    table.string('event_start_date', 255).nullable();
    table.string('event_end_date', 255).nullable();
    table.string('event_time', 255).nullable();
    table.string('bride_name', 255).nullable();
    table.string('groom_name', 255).nullable();
    table.string('contact_email', 255).nullable();
    table.string('contact_phone', 255).nullable();
    table.string('event_type', 255).nullable();
    table.string('dress_code', 255).nullable();
    table.text('special_instructions').nullable();
    table.string('website_url', 255).nullable();
    table.string('app_title', 255).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const exists = await knex.schema.hasColumn('settings', 'venue_name');
  if (!exists) return;
  await knex.schema.alterTable('settings', function(table) {
    table.dropColumn('venue_name');
    table.dropColumn('venue_address');
    table.dropColumn('event_start_date');
    table.dropColumn('event_end_date');
    table.dropColumn('event_time');
    table.dropColumn('bride_name');
    table.dropColumn('groom_name');
    table.dropColumn('contact_email');
    table.dropColumn('contact_phone');
    table.dropColumn('event_type');
    table.dropColumn('dress_code');
    table.dropColumn('special_instructions');
    table.dropColumn('website_url');
    table.dropColumn('app_title');
  });
};
