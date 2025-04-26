const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Construct full path to database file
const dbPath = path.join(__dirname, '..', 'database.sqlite');

// Function to get a new database connection
function getDbConnection() {
  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('❌ Failed to connect to database:', err.message);
    } else {
      console.log('✅ Connected to SQLite database.');
    }
  });
  return db;
}

// Export the function to get a fresh connection
module.exports = getDbConnection;
