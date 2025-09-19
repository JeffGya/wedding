// apps/backend/scripts/importBaseline.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const { DB_HOST, DB_PORT = 3306, DB_USER, DB_PASS, DB_NAME } = process.env;

  if (!DB_HOST || !DB_USER || !DB_NAME) {
    const logger = require('../helpers/logger');
    logger.error('Missing required env: DB_HOST, DB_USER, DB_NAME (and optionally DB_PASS, DB_PORT)');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASS,
    multipleStatements: true
  });

  await conn.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await conn.query(`USE \`${DB_NAME}\``);

  const sqlPath = path.resolve(__dirname, '../migrations/mysql_baseline_schema.sql');
  let sql = fs.readFileSync(sqlPath, 'utf8');

  // Strip MySQL directive comments and ensure we do not touch Knex meta tables
  sql = sql.replace(/\/\*![\s\S]*?\*\//g, '');

  // Filter out any DROP/CREATE for knex meta tables, including IF [NOT] EXISTS and schema-qualified names
  const META_TABLE_RE = /^\s*(?:DROP|CREATE)\s+TABLE\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?(?:(?:`[^`]+`|\w+)\.)?`?knex_migrations(?:_lock)?`?\b/i;
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map(s => s.trim())
    .filter(Boolean)
    .filter(s => !META_TABLE_RE.test(s));

  const filteredSql = statements.join(';\n') + ';';

  await conn.query(filteredSql);

  await conn.end();
  const logger = require('../helpers/logger');
  logger.info(`✅ Baseline schema imported into ${DB_NAME}`);
})().catch(err => {
  const logger = require('../helpers/logger');
  logger.error('Import failed:', err.message);
  process.exit(1);
});
