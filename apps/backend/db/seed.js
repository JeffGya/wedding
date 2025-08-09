const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

(async () => {
  const mysql = require('mysql2/promise');
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  const runQuery = async (sql, params = []) => {
    const [rows] = await db.execute(sql, params);
    return rows;
  };

  // Users
  const users = [
    { name: 'Jeffrey', email: 'jeffrey@example.com', password: 'password123' },
    { name: 'Brigita', email: 'brigita@example.com', password: 'wedding2024' }
  ];
  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    await runQuery(
      'INSERT IGNORE INTO users (name, email, passwordHash) VALUES (?, ?, ?)',
      [user.name, user.email, hash]
    );
  }

  // Guests
  const guestGroupsData = [
    { groupId: 1, groupLabel: 'Jeffrey & Brigita', guests: [{ name: 'Jeffrey', email: 'jeffrey@example.com' }, { name: 'Brigita' }] },
    { groupId: 2, groupLabel: 'The Doe Family', guests: [{ name: 'John Doe', email: 'john@example.com' }, { name: 'Jane Doe' }] },
    { groupId: 3, groupLabel: 'Alice', guests: [{ name: 'Alice', email: 'alice@example.com', can_bring_plus_one: true }] },
    { groupId: 4, groupLabel: 'The Smiths', guests: [{ name: 'Anna Smith', email: 'anna.smith@example.com' }, { name: 'Mark Smith' }] },
    { groupId: 5, groupLabel: 'Emma & Liam', guests: [{ name: 'Emma', email: 'emma@example.com' }, { name: 'Liam' }] },
    { groupId: 6, groupLabel: 'Robert', guests: [{ name: 'Robert', email: 'robert@example.com' }] },
    { groupId: 7, groupLabel: 'Sofia & Mateo', guests: [{ name: 'Sofia', email: 'sofia@example.com' }, { name: 'Mateo' }] },
    { groupId: 8, groupLabel: 'Olivia', guests: [{ name: 'Olivia', email: 'olivia@example.com', can_bring_plus_one: true }] }
  ];

  const genCode = async () => {
    while (true) {
      const code = Math.random().toString(36).substring(2, 10);
      const rows = await runQuery('SELECT 1 FROM guests WHERE code = ?', [code]);
      if (rows.length === 0) return code;
    }
  };

  for (const group of guestGroupsData) {
    const groupCode = await genCode();
    for (let i = 0; i < group.guests.length; i++) {
      const g = group.guests[i];
      const isPrimary = i === 0 ? 1 : 0;
      const preferred = g.preferred_language || (Math.random() < 0.5 ? 'en' : 'lt');
      await runQuery(
        `INSERT INTO guests (
          group_id, group_label, name, email, code,
          can_bring_plus_one, is_primary, preferred_language,
          attending, rsvp_deadline, dietary, notes, rsvp_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          group.groupId,
          group.groupLabel,
          g.name,
          g.email || null,
          isPrimary ? groupCode : null,
          g.can_bring_plus_one || 0,
          isPrimary,
          preferred,
          isPrimary ? 0 : null,
          null,
          null,
          null,
          isPrimary ? 'not_attending' : 'pending'
        ]
      );
    }
  }

  // Email settings (default row)
  await runQuery(
    `INSERT IGNORE INTO email_settings (id, provider, api_key, from_name, from_email, sender_name, sender_email, enabled, created_at, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    ['resend', 'your-api-key-here', 'Wedding Admin', 'admin@example.com', 'Wedding Admin', 'admin@example.com', 1]
  );

  // Templates (include style)
  await runQuery(
    `INSERT INTO templates (name, subject, body_en, body_lt, style) VALUES (?, ?, ?, ?, ?)`,
    [
      'Default Bilingual Template',
      'Default Template Subject',
      '<html><body><p>Hello {{ name }} from {{ groupLabel }}!</p><p>Please RSVP using this link: {{ rsvpLink }}</p></body></html>',
      '<html><body><p>Sveiki {{ name }} iš {{ groupLabel }}!</p><p>Prašome atsakyti į kvietimą naudodamiesi šia nuoroda: {{ rsvpLink }}</p></body></html>',
      'elegant'
    ]
  );

  // Messages and recipients (include style)
  const result = await runQuery(
    `INSERT INTO messages (subject, body_en, body_lt, status, scheduled_for, style) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'Save the Date – Scheduled',
      '<p>Hello {{ name }}, save the date! 🎉</p>',
      '<p>Sveiki {{ name }}, išsisaugok datą! 🎉</p>',
      'scheduled',
      '2025-05-01 12:00:00',
      'elegant'
    ]
  );
  const messageId = result.insertId;

  const [[g1], [g2], [g3]] = await Promise.all([
    runQuery('SELECT id FROM guests ORDER BY id LIMIT 1'),
    runQuery('SELECT id FROM guests ORDER BY id LIMIT 1 OFFSET 1'),
    runQuery('SELECT id FROM guests ORDER BY id LIMIT 1 OFFSET 2')
  ]);

  const insRec = `INSERT INTO message_recipients (message_id, guest_id, delivery_status, email, language, created_at)
                  VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`;
  await runQuery(insRec, [messageId, g1.id, 'sent', 'jeffrey@example.com', 'en']);
  await runQuery(insRec, [messageId, g2.id, 'failed', 'john@example.com', 'en']);
  await runQuery(insRec, [messageId, g3.id, 'pending', 'alice@example.com', 'lt']);

  // Example pages and translations
  const pageRes = await runQuery(
    'INSERT IGNORE INTO pages (slug, is_published, requires_rsvp, show_in_nav, nav_order) VALUES (?, ?, ?, ?, ?)',
    ['our-story', 1, 0, 1, 1]
  );
  const [pageRow] = await runQuery('SELECT id FROM pages WHERE slug = ?', ['our-story']);
  const pageId = pageRow.id;

  const contentEn = JSON.stringify([
    { type: 'richText', content: '<p>We met in 2015, and the rest is history...</p>' },
    { type: 'image', url: '/uploads/story.jpg', alt: 'Us smiling' },
    { type: 'divider' },
    { type: 'map', embedUrl: 'https://maps.google.com/your-venue' }
  ]);
  const contentLt = JSON.stringify([
    { type: 'richText', content: '<p>Susipažinome 2015 metais, o visa kita – istorija...</p>' },
    { type: 'image', url: '/uploads/story.jpg', alt: 'Mes šypsomės' },
    { type: 'divider' },
    { type: 'map', embedUrl: 'https://maps.google.com/your-venue' }
  ]);

  await runQuery(
    'INSERT IGNORE INTO page_translations (page_id, locale, title, content) VALUES (?, ?, ?, ?)',
    [pageId, 'en', 'Our Story', contentEn]
  );
  await runQuery(
    'INSERT IGNORE INTO page_translations (page_id, locale, title, content) VALUES (?, ?, ?, ?)',
    [pageId, 'lt', 'Mūsų istorija', contentLt]
  );

  // “All Blocks” page and a simple survey block
  const pageAllRes = await runQuery(
    'INSERT IGNORE INTO pages (slug, is_published, requires_rsvp, show_in_nav, nav_order) VALUES (?, ?, ?, ?, ?)',
    ['all-blocks', 1, 0, 1, 2]
  );
  const [pageAllRow] = await runQuery('SELECT id FROM pages WHERE slug = ?', ['all-blocks']);
  const pageAllId = pageAllRow.id;

  const surveyOptions = JSON.stringify(['Option A', 'Option B']);
  const surveyRes = await runQuery(
    'INSERT INTO survey_blocks (page_id, locale, question, type, options, is_required, is_anonymous) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [pageAllId, 'en', 'Do you like our site?', 'radio', surveyOptions, 1, 0]
  );
  const surveyAllId = surveyRes.insertId;

  const allBlocksContent = JSON.stringify([
    { type: 'rich-text', html: '<p>Welcome to the all-blocks test page.</p>' },
    { type: 'image', src: '/uploads/story.jpg', alt: 'Us smiling' },
    { type: 'video', embed: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    { type: 'map', embed: 'https://maps.google.com/maps?q=London&output=embed' },
    { type: 'divider' },
    { type: 'survey', id: surveyAllId }
  ]);
  await runQuery(
    'INSERT IGNORE INTO page_translations (page_id, locale, title, content) VALUES (?, ?, ?, ?)',
    [pageAllId, 'en', 'All Blocks Test', allBlocksContent]
  );

  await db.end();
  const logger = require('../helpers/logger');
  logger.info('✅ Seed completed.');
})().catch(err => {
  const logger = require('../helpers/logger');
  logger.error('❌ Seed failed:', err);
  process.exit(1);
});
