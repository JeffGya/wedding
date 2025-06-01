// apps/backend/db/seedUsers.js

// (1) Load bcrypt to hash passwords
const bcrypt = require('bcryptjs');

// (2) Depending on DB_TYPE, either use mysql2 or sqlite
let runQuery;
(async () => {
  if (process.env.DB_TYPE === 'mysql') {
    // -- MySQL branch --
    const mysql = require('mysql2/promise');
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });

    runQuery = async (sql, params) => {
      const [res] = await db.execute(sql, params);
      return res;
    };

    // -- Insert your users here: --
    const users = [
      { name: 'Future Husband Jeffrey', email: 'jeffogya@gmail.com', password: 'password123' },
      { name: 'Future Wife Brigita', email: 'brigita@example.com', password: 'wedding2024' }
    ];

    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      const sql = `
        INSERT IGNORE INTO users (name, email, passwordHash)
        VALUES (?, ?, ?)
      `;
      await runQuery(sql, [u.name, u.email, hash]);
      console.log(`– inserted user ${u.email}`);
    }

    await db.end();
    console.log('✅ MySQL: users seeded.');
  } else {
    // -- SQLite branch (if you ever want to run locally against SQLite) --
    const sqlite3 = require('sqlite3').verbose();
    const { promisify } = require('util');
    const path = require('path');
    const dbPath = path.resolve(__dirname, '../database.sqlite');
    const sqliteDb = new sqlite3.Database(dbPath);
    const run = promisify(sqliteDb.run.bind(sqliteDb));

    const users = [
      { name: 'Future Husband Jeffrey', email: 'jeffogya@example.com', password: 'password123' },
      { name: 'Future Wife Brigita', email: 'brigita@example.com', password: 'wedding2024' }
    ];

    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      const sql = `
        INSERT OR IGNORE INTO users (name, email, passwordHash)
        VALUES (?, ?, ?)
      `;
      await run(sql, [u.name, u.email, hash]);
      console.log(`– inserted user ${u.email}`);
    }

    sqliteDb.close();
    console.log('✅ SQLite: users seeded.');
  }
})();