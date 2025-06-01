const path = require('path');

// Initialize database connection (singleton) based on DB_TYPE
let dbClient;

if (process.env.DB_TYPE === 'mysql') {
  // MySQL connection using mysql2, created once
  const mysql = require('mysql2');
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('❌ Failed to connect to MySQL database:', err.message);
    } else {
      console.log('✅ Connected to MySQL database.');
      connection.release();
    }
  });
  dbClient = pool.promise();
} else {
  // SQLite: open database once
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(__dirname, '..', 'database.sqlite');
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Failed to connect to SQLite database:', err.message);
    } else {
      console.log('✅ Connected to SQLite database.');
    }
  });
  dbClient = db;
}

// Export helper function to get the same client instance
function getDbConnection() {
  return dbClient;
}

module.exports = getDbConnection;
