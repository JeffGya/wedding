/**
 * Database Query Helpers
 * Unified abstraction for MySQL and SQLite database operations
 */

/**
 * Create database query helpers based on DB type
 * @param {Object} db - Database connection
 * @returns {Object} Object with dbGet, dbAll, dbRun functions
 */
function createDbHelpers(db) {
  let dbGet, dbAll, dbRun;
  
  if (process.env.DB_TYPE === 'mysql') {
    dbGet = async (sql, params) => {
      const [rows] = await db.query(sql, params);
      return rows[0];
    };
    dbAll = async (sql, params) => {
      const [rows] = await db.query(sql, params);
      return rows;
    };
    dbRun = async (sql, params) => {
      const [result] = await db.query(sql, params);
      return result;
    };
  } else {
    const sqlite3 = require('sqlite3').verbose();
    const util = require('util');
    dbGet = util.promisify(db.get.bind(db));
    dbAll = util.promisify(db.all.bind(db));
    dbRun = util.promisify(db.run.bind(db));
  }
  
  return { dbGet, dbAll, dbRun };
}

module.exports = {
  createDbHelpers
};

