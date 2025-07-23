// 20250723214925_make_page_id_nullable_on_survey_blocks.js
// Make survey_blocks.page_id NULLable and re-add FK with matching type/signature as pages.id

exports.up = async function (knex) {
    const client = knex.client.config.client;
  
    if (client === 'mysql' || client === 'mysql2') {
      // 0) Detect pages.id column type (e.g. "int unsigned", "bigint unsigned")
      const [colRows] = await knex.raw(`
        SELECT COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'pages'
          AND COLUMN_NAME = 'id'
        LIMIT 1;
      `);
      if (!colRows.length) {
        throw new Error('Could not detect pages.id COLUMN_TYPE');
      }
      const columnType = colRows[0].COLUMN_TYPE; // e.g. "int unsigned"
  
      // 1) Drop any existing FK on survey_blocks.page_id
      const [fkRows] = await knex.raw(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'survey_blocks'
          AND COLUMN_NAME = 'page_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL;
      `);
      for (const row of fkRows) {
        await knex.raw(`ALTER TABLE survey_blocks DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``);
      }
  
      // 2) Alter column to match pages.id type & allow NULL
      await knex.raw(`ALTER TABLE survey_blocks MODIFY page_id ${columnType} NULL`);
  
      // 3) Re-add FK with SET NULL on delete
      await knex.schema.alterTable('survey_blocks', (t) => {
        t
          .foreign('page_id')
          .references('id')
          .inTable('pages')
          .onDelete('SET NULL')
          .onUpdate('CASCADE');
      });
    } else {
      // SQLite (no strict FK alter), knex will rebuild table
      await knex.schema.alterTable('survey_blocks', (t) => {
        t.integer('page_id').nullable().alter();
      });
    }
  };
  
  exports.down = async function (knex) {
    const client = knex.client.config.client;
  
    if (client === 'mysql' || client === 'mysql2') {
      // Detect pages.id type again
      const [colRows] = await knex.raw(`
        SELECT COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'pages'
          AND COLUMN_NAME = 'id'
        LIMIT 1;
      `);
      if (!colRows.length) {
        throw new Error('Could not detect pages.id COLUMN_TYPE (down)');
      }
      const columnType = colRows[0].COLUMN_TYPE;
  
      // Drop FK
      const [fkRows] = await knex.raw(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'survey_blocks'
          AND COLUMN_NAME = 'page_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL;
      `);
      for (const row of fkRows) {
        await knex.raw(`ALTER TABLE survey_blocks DROP FOREIGN KEY \`${row.CONSTRAINT_NAME}\``);
      }
  
      // Make NOT NULL again
      await knex.raw(`ALTER TABLE survey_blocks MODIFY page_id ${columnType} NOT NULL`);
  
      // Re-add FK with RESTRICT on delete (original stricter behavior)
      await knex.schema.alterTable('survey_blocks', (t) => {
        t
          .foreign('page_id')
          .references('id')
          .inTable('pages')
          .onDelete('RESTRICT')
          .onUpdate('CASCADE');
      });
    } else {
      await knex.schema.alterTable('survey_blocks', (t) => {
        t.integer('page_id').notNullable().alter();
      });
    }
  };