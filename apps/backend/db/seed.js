const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Add support for MySQL
let db, execSql, runQuery, closeDb;

(async () => {
  if (process.env.DB_TYPE === 'mysql') {
    const mysql = require('mysql2/promise');
    const dbConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      multipleStatements: true
    };
    db = await mysql.createConnection(dbConfig);
    execSql = async (sql) => {
      await db.query(sql);
    };
    runQuery = async (sql, params) => {
      const [result] = await db.execute(sql, params);
      return result;
    };
    closeDb = async () => {
      await db.end();
    };
  } else {
    const sqlite3 = require('sqlite3').verbose();
    const { promisify } = require('util');
    const dbPath = path.resolve(__dirname, '../database.sqlite');
    const sqliteDb = new sqlite3.Database(dbPath);
    db = sqliteDb;
    execSql = async (sql) => {
      await promisify(db.exec.bind(db))(sql);
    };
    runQuery = async (sql, params) => {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) return reject(err);
          resolve({ lastID: this.lastID, changes: this.changes });
        });
      });
    };
    closeDb = async () => {
      db.close();
    };
  }

  // Run schema for SQLite or MySQL
  const initSqlPath = path.resolve(__dirname, process.env.DB_TYPE === 'mysql' ? '../schema/mysql_init.sql' : '../schema/init.sql');
  const initSql = fs.readFileSync(initSqlPath, 'utf-8');
  try {
    await execSql(initSql);
    console.log('✅ Schema applied successfully.');
    await seedDatabase();
  } catch (err) {
    console.error('Failed to apply schema:', err.message);
  }
})();


// Seed function for both SQLite and MySQL
async function seedDatabase() {
  // Seed users
  const users = [
    { name: 'Jeffrey', email: 'jeffrey@example.com', password: 'password123' },
    { name: 'Brigita', email: 'brigita@example.com', password: 'wedding2024' }
  ];
  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    const insertUserSql = process.env.DB_TYPE === 'mysql'
      ? 'INSERT IGNORE INTO users (name, email, passwordHash) VALUES (?, ?, ?)'
      : 'INSERT OR IGNORE INTO users (name, email, passwordHash) VALUES (?, ?, ?)';
    await runQuery(insertUserSql, [user.name, user.email, hash]);
  }
  console.log('Users seeded successfully.');

  // Guest groups and guests
  const guestGroupsData = [
    {
      groupId: 1,
      groupLabel: 'Jeffrey & Brigita',
      guests: [
        { name: 'Jeffrey', email: 'jeffrey@example.com' },
        { name: 'Brigita' }
      ]
    },
    {
      groupId: 2,
      groupLabel: 'The Doe Family',
      guests: [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Doe' }
      ]
    },
    {
      groupId: 3,
      groupLabel: 'Alice',
      guests: [
        { name: 'Alice', email: 'alice@example.com', can_bring_plus_one: true }
      ]
    },
    {
      groupId: 4,
      groupLabel: 'The Smiths',
      guests: [
        { name: 'Anna Smith', email: 'anna.smith@example.com' },
        { name: 'Mark Smith' }
      ]
    },
    {
      groupId: 5,
      groupLabel: 'Emma & Liam',
      guests: [
        { name: 'Emma', email: 'emma@example.com' },
        { name: 'Liam' }
      ]
    },
    {
      groupId: 6,
      groupLabel: 'Robert',
      guests: [
        { name: 'Robert', email: 'robert@example.com' }
      ]
    },
    {
      groupId: 7,
      groupLabel: 'Sofia & Mateo',
      guests: [
        { name: 'Sofia', email: 'sofia@example.com' },
        { name: 'Mateo' }
      ]
    },
    {
      groupId: 8,
      groupLabel: 'Olivia',
      guests: [
        { name: 'Olivia', email: 'olivia@example.com', can_bring_plus_one: true }
      ]
    }
  ];

  // Generate codes and insert guests
  for (const groupData of guestGroupsData) {
    const code = await new Promise((resolve, reject) => {
      const tryCode = async () => {
        const checkSql = process.env.DB_TYPE === 'mysql'
          ? 'SELECT 1 FROM guests WHERE code = ?'
          : 'SELECT 1 FROM guests WHERE code = ?';
        // Generate a code, check if it exists, retry if so
        const newCode = Math.random().toString(36).substring(2, 10);
        const existRow = await runQuery(checkSql, [newCode]);
        if (existRow && (existRow.length > 0 || existRow.changes === 0)) {
          return tryCode(); // Ensure proper recursion flow
        } else {
          resolve(newCode);
        }
      };
      tryCode().catch(reject);
    });

    for (let i = 0; i < groupData.guests.length; i++) {
      const guest = groupData.guests[i];
      const preferredLanguage = guest.preferred_language || (Math.random() < 0.5 ? 'en' : 'lt');
      const isPrimary = i === 0 ? 1 : 0;
      const sql = process.env.DB_TYPE === 'mysql'
        ? `INSERT INTO guests (
             group_id, group_label, name, email, code,
             can_bring_plus_one, is_primary, preferred_language,
             attending, rsvp_deadline, dietary, notes, rsvp_status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        : `INSERT OR IGNORE INTO guests (
             group_id, group_label, name, email, code,
             can_bring_plus_one, is_primary, preferred_language,
             attending, rsvp_deadline, dietary, notes, rsvp_status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const params = [
        groupData.groupId,
        groupData.groupLabel,
        guest.name,
        guest.email || null,
        isPrimary ? code : null,
        guest.can_bring_plus_one || 0,
        isPrimary,
        preferredLanguage,
        isPrimary ? 0 : null,
        null,
        null,
        null,
        isPrimary ? 'not_attending' : 'pending'
      ];
      await runQuery(sql, params);
    }
  }
  console.log('Guests seeded successfully.');

  // Email settings
  const emailInsertSql = process.env.DB_TYPE === 'mysql'
    ? `INSERT IGNORE INTO email_settings (
         provider, api_key, sender_name, sender_email, enabled
       ) VALUES (?, ?, ?, ?, ?)`
    : `INSERT OR IGNORE INTO email_settings (
         provider, api_key, sender_name, sender_email, enabled
       ) VALUES (?, ?, ?, ?, ?)`;
  await runQuery(emailInsertSql, [
    'resend',
    'your-api-key-here',
    'Wedding Admin',
    'admin@example.com',
    1
  ]);
  console.log('Email settings seeded successfully.');

  // Templates
  const templateSql = process.env.DB_TYPE === 'mysql'
    ? `INSERT INTO templates (name, subject, body_en, body_lt) VALUES (?, ?, ?, ?)`
    : `INSERT INTO templates (name, subject, body_en, body_lt) VALUES (?, ?, ?, ?)`;
  await runQuery(templateSql, [
    'Default Bilingual Template',
    'Default Template Subject',
    '<html><body><p>Hello {{ name }} from {{ groupLabel }}!</p><p>Please RSVP using this link: {{ rsvpLink }}</p></body></html>',
    '<html><body><p>Sveiki {{ name }} iš {{ groupLabel }}!</p><p>Prašome atsakyti į kvietimą naudodamiesi šia nuoroda: {{ rsvpLink }}</p></body></html>'
  ]);
  console.log('Templates seeded successfully.');

  // Messages and recipients
  const msgSql = process.env.DB_TYPE === 'mysql'
    ? `INSERT INTO messages (subject, body_en, body_lt, status, scheduled_for) VALUES (?, ?, ?, ?, ?)`
    : `INSERT INTO messages (subject, body_en, body_lt, status, scheduled_for) VALUES (?, ?, ?, ?, ?)`;
  const result = await runQuery(msgSql, [
    'Save the Date – Scheduled',
    '<p>Hello {{ name }}, save the date! 🎉</p>',
    '<p>Sveiki {{ name }}, išsisaugok datą! 🎉</p>',
    'scheduled',
    '2025-05-01 12:00:00'
  ]);
  const messageId = result.insertId || result.lastID || 1;
  const draftResult = await runQuery(msgSql, [
    'Save the Date – Draft Only',
    '<p>Just a draft for now.</p>',
    '<p>Kol kas tik juodraštis.</p>',
    'draft',
    null
  ]);

  console.log('Messages seeded successfully.');
  const recSql = process.env.DB_TYPE === 'mysql'
    ? `INSERT INTO message_recipients (message_id, guest_id, delivery_status, email, language, created_at) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`
    : `INSERT INTO message_recipients (message_id, guest_id, delivery_status, email, language, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`;
  await runQuery(recSql, [messageId, 1, 'sent', 'jeffrey@example.com', 'en']);
  await runQuery(recSql, [messageId, 2, 'failed', 'john@example.com', 'en']);
  await runQuery(recSql, [messageId, 3, 'pending', 'alice@example.com', 'lt']);
  console.log('Recipients seeded successfully.');

  await closeDb();
}
