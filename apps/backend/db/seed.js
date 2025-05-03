const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Resolve database path relative to project
const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Run schema init.sql first
const initSqlPath = path.resolve(__dirname, '../schema/init.sql');
const initSql = fs.readFileSync(initSqlPath, 'utf-8');
db.exec(initSql, (err) => {
  if (err) {
    console.error('Failed to apply schema:', err.message);
    return;
  }

  // Continue with seeding after schema is applied
  seedDatabase();
});

function generateUniqueCode(callback) {
  const tryCode = () => {
    const code = Math.random().toString(36).substring(2, 10);
    db.get(`SELECT 1 FROM guests WHERE code = ?`, [code], (err, row) => {
      if (err) return callback(err);
      if (row) return tryCode(); // Retry if exists
      callback(null, code);
    });
  };
  tryCode();
}

function seedDatabase() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL
    )`);

    const users = [
      { name: 'Jeffrey', email: 'jeffrey@example.com', password: 'password123' },
      { name: 'Brigita', email: 'brigita@example.com', password: 'wedding2024' }
    ];

    const insertStmt = db.prepare(`INSERT OR IGNORE INTO users (name, email, passwordHash) VALUES (?, ?, ?)`);

    (async () => {
      for (const user of users) {
        const hash = await bcrypt.hash(user.password, 10);
        insertStmt.run(user.name, user.email, hash);
      }

      insertStmt.finalize(() => {
        console.log('Users seeded successfully.');

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
              { name: 'John Doe', email: 'john@example.com', num_kids: 2 },
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
              { name: 'Anna Smith', email: 'anna.smith@example.com', num_kids: 3 },
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

        let groupIndex = 0;

        function nextGroup() {
          if (groupIndex >= guestGroupsData.length) {
            console.log('Guests seeded successfully.');

            const emailSettingsInsert = db.prepare(`INSERT OR IGNORE INTO email_settings (
              provider, api_key, sender_name, sender_email, enabled
            ) VALUES (?, ?, ?, ?, ?)`);

            emailSettingsInsert.run(
              'resend',
              'your-api-key-here',
              'Wedding Admin',
              'admin@example.com',
              1,
              () => {
                emailSettingsInsert.finalize(() => {
                  const templatesInsert = db.prepare(`INSERT INTO templates (name, subject, body_en, body_lt) VALUES (?, ?, ?, ?)`);
                  templatesInsert.run(
                    'Default Bilingual Template',
                    'Default Template Subject',
                    '<html><body><p>Hello {{ name }} from {{ groupLabel }}!</p><p>Please RSVP using this link: {{ rsvpLink }}</p></body></html>',
                    '<html><body><p>Sveiki {{ name }} iš {{ groupLabel }}!</p><p>Prašome atsakyti į kvietimą naudodamiesi šia nuoroda: {{ rsvpLink }}</p></body></html>'
                  );
                  templatesInsert.finalize(() => {
                    console.log('Templates seeded successfully.');
                    const messagesInsert = db.prepare(`INSERT INTO messages (subject, body_en, body_lt, status, scheduled_for) VALUES (?, ?, ?, ?, ?)`);
                    messagesInsert.run(
                      'Save the Date – Scheduled',
                      '<p>Hello {{ name }}, save the date! 🎉</p>',
                      '<p>Sveiki {{ name }}, išsisaugok datą! 🎉</p>',
                      'scheduled',
                      '2025-05-01T12:00:00Z',
                      () => {
                        messagesInsert.run(
                          'Save the Date – Draft Only',
                          '<p>Just a draft for now.</p>',
                          '<p>Kol kas tik juodraštis.</p>',
                          'draft',
                          null
                        );
                        messagesInsert.finalize(() => {
                          console.log('Messages seeded successfully.');
                          const recipientsInsert = db.prepare(`INSERT INTO message_recipients (message_id, guest_id, delivery_status, email, language, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`);

                          recipientsInsert.run(1, 1, 'sent', 'jeffrey@example.com', 'en');
                          recipientsInsert.run(1, 2, 'failed', 'john@example.com', 'en');
                          recipientsInsert.run(1, 3, 'pending', 'alice@example.com', 'lt');

                          recipientsInsert.finalize(() => {
                            console.log('Recipients seeded successfully.');
                            db.close();
                          });
                        });
                      }
                    );
                  });
                });
              }
            );
            return;
          }

          const groupData = guestGroupsData[groupIndex++];
          generateUniqueCode((err, code) => {
            if (err) throw err;

            const guestInsert = db.prepare(`INSERT INTO guests (
              group_id, group_label, name, email, code,
              can_bring_plus_one, num_kids, preferred_language,
              attending, meal_preference, rsvp_deadline, notes, rsvp_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            const languages = ['en', 'lt'];
            const insertNext = (i = 0) => {
              if (i >= groupData.guests.length) {
                guestInsert.finalize(() => {
                  nextGroup();
                });
                return;
              }

              const guest = groupData.guests[i];
              const preferredLanguage = guest.preferred_language || languages[Math.floor(Math.random() * languages.length)];

              // Only the first guest (lead) gets RSVP-related fields
              if (i === 0) {
                guestInsert.run(
                  groupData.groupId,
                  groupData.groupLabel,
                  guest.name,
                  guest.email || null,
                  code,
                  guest.can_bring_plus_one || 0,
                  guest.num_kids || 0,
                  preferredLanguage,
                  0,            // attending default to 0 (not attending)
                  null,         // meal_preference null
                  null,         // rsvp_deadline null
                  null,         // notes null
                  'not_attending',
                  () => insertNext(i + 1)
                );
              } else {
                // For non-lead guests, RSVP fields are null
                guestInsert.run(
                  groupData.groupId,
                  groupData.groupLabel,
                  guest.name,
                  guest.email || null,
                  code,
                  guest.can_bring_plus_one || 0,
                  guest.num_kids || 0,
                  preferredLanguage,
                  null,
                  null,
                  null,
                  null,
                  'pending',
                  () => insertNext(i + 1)
                );
              }
            };

            insertNext();
          });
        }

        nextGroup();
      });
    })();
  });
}
