const fs = require('fs');
const path = require('path');

// baseline_schema.js
exports.up = async (knex) => {
  const sqlPath = path.join(__dirname, 'mysql_baseline_schema.sql');
  let sql = fs.readFileSync(sqlPath, 'utf8');
  // Remove MySQL-specific /*!...*/ directive comments that may cause syntax errors
  sql = sql.replace(/\/\*![\s\S]*?\*\//g, '');
  // Remove any blank lines or lines with only semicolons
  sql = sql.replace(/^\s*;\s*$/gm, '');
  // Split into individual statements and execute them one by one
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map(s => s.trim())
    .filter(s => s);

  // Disable FK checks so DROP/CREATE can run without constraint errors
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0;');
  for (const stmt of statements) {
    await knex.raw(stmt);
  }
  // Re-enable FK checks
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1;');
};

exports.down = async () => {
  throw new Error('Baseline migration is irreversible');
};