const fs = require('fs');
const path = require('path');

// baseline_schema.js
exports.up = async (knex) => {
  // If DB already has core tables, skip baseline to avoid "table exists" errors
  const alreadyHasMessages = await knex.schema.hasTable('messages');
  if (alreadyHasMessages) {
    const logger = require('../helpers/logger');
    logger.info('[baseline] Existing tables detected; skipping baseline import.');
    return;
  }

  const sqlPath = path.join(__dirname, 'mysql_baseline_schema.sql');
  let sql = fs.readFileSync(sqlPath, 'utf8');

  // Strip MySQL directive comments
  sql = sql.replace(/\/\*![\s\S]*?\*\//g, '');

  // Split statements
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map(s => s.trim())
    .filter(Boolean)
    // Do NOT drop/create Knex's meta tables inside a migration
    .filter(s => !/^\s*(DROP|CREATE)\s+TABLE\s+`?knex_migrations(_lock)?`?/i.test(s));

  await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');
  for (const stmt of statements) {
    await knex.raw(stmt);
  }
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');
};

exports.down = async () => {
  throw new Error('Baseline migration is irreversible');
};