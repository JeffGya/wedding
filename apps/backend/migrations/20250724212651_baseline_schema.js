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
  // Filter out any DROP/CREATE of Knex's own meta tables, allowing for
  // optional IF [NOT] EXISTS and optional schema qualification.
  const META_TABLE_RE = /^\s*(?:DROP|CREATE)\s+TABLE\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(?:(?:`[^`]+`|\w+)\.)?`?knex_migrations(?:_lock)?`?\b/i;

  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => !META_TABLE_RE.test(s));

  await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');
  for (const stmt of statements) {
    await knex.raw(stmt);
  }
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');
};

exports.down = async () => {
  throw new Error('Baseline migration is irreversible');
};
