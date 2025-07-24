/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema
      .createTable('pages', table => {
        table.increments('id').primary();
        table.string('slug').unique().notNullable();
        table.boolean('is_published').defaultTo(false);
        table.boolean('requires_rsvp').defaultTo(false);
        table.boolean('show_in_nav').defaultTo(true);
        table.integer('nav_order').defaultTo(0);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
      })
      .then(() => knex.schema.createTable('page_translations', table => {
        table.increments('id').primary();
        table.integer('page_id').unsigned().notNullable()
          .references('id').inTable('pages').onDelete('CASCADE');
        table.enu('locale', ['en', 'lt']).notNullable();
        table.string('title').notNullable();
        table.json('content').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
      }))
      .then(() => knex.schema.createTable('survey_blocks', table => {
        table.increments('id').primary();
        table.integer('page_id').unsigned().notNullable()
          .references('id').inTable('pages').onDelete('CASCADE');
        table.enu('locale', ['en', 'lt']).notNullable();
        table.text('question').notNullable();
        table.enu('type', ['radio', 'checkbox', 'text']).notNullable();
        table.json('options').nullable();
        table.boolean('is_required').defaultTo(false);
        table.boolean('is_anonymous').defaultTo(true);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
      }))
      .then(() => knex.schema.createTable('survey_responses', table => {
        table.increments('id').primary();
        table.integer('survey_block_id').unsigned().notNullable()
          .references('id').inTable('survey_blocks').onDelete('CASCADE');
        table.integer('guest_id').nullable()
          .references('id').inTable('guests').onDelete('SET NULL');
        table.text('response').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
      }));
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema
      .dropTableIfExists('survey_responses')
      .then(() => knex.schema.dropTableIfExists('survey_blocks'))
      .then(() => knex.schema.dropTableIfExists('page_translations'))
      .then(() => knex.schema.dropTableIfExists('pages'));
  };