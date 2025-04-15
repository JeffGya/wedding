const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Construct full path to database file
const dbPath = path.join(__dirname, '..', 'database.sqlite');

// Open the SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to connect to database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database.');
  }
});

// Export the database connection
module.exports = db;
