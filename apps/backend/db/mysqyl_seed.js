require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

(async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  const logger = require('../helpers/logger');
  logger.info('Seeding into database:', process.env.DB_NAME);
  await connection.query(`USE \`${process.env.DB_NAME}\``);

  // Seed users
  const users = [
    { username: 'admin', email: 'admin@example.com', password: 'admin123' },
    { username: 'jeff', email: 'jeff@example.com', password: 'password123' }
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const sql = `
      INSERT IGNORE INTO users (username, email, password_hash)
      VALUES (?, ?, ?)
    `;
    await connection.execute(sql, [u.username, u.email, hash]);
    logger.info(`– inserted user ${u.email}`);
  }

  // Seed email_settings
  const emailSettings = [
    {
      provider: 'resend',
      api_key: 'YOUR_REAL_API_KEY',
      from_name: 'Jeff & Brigit',
      from_email: 'hello@ourwedding.com',
      sender_name: 'Jeff & Brigit',
      sender_email: 'hello@ourwedding.com',
      enabled: 1
    }
  ];

  for (const e of emailSettings) {
    const sql = `
      INSERT INTO email_settings
        (provider, api_key, from_name, from_email, sender_name, sender_email, enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        api_key = VALUES(api_key),
        from_name = VALUES(from_name),
        from_email = VALUES(from_email),
        sender_name = VALUES(sender_name),
        sender_email = VALUES(sender_email),
        enabled = VALUES(enabled)
    `;
    await connection.execute(sql, [
      e.provider, e.api_key, e.from_name, e.from_email,
      e.sender_name, e.sender_email, e.enabled
    ]);
    logger.info(`– seeded email_settings for provider ${e.provider}`);
  }

  // Seed templates
  const templates = [
    {
      name: 'rsvp_request',
      category: 'rsvp',
      subject_en: 'Please RSVP for our wedding!',
      subject_lt: 'Prašome atsakyti į mūsų vestuvių pakvietimą!',
      body_en: 'Hey {{name}}, please let us know if you can make it …',
      body_lt: 'Labas {{name}}, prašome pranešti, ar galite atvykti…',
      style: 'elegant'
    }
  ];

  for (const t of templates) {
    const sql = `
      INSERT INTO templates
        (name, category, subject_en, subject_lt, body_en, body_lt, style)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        subject_en = VALUES(subject_en),
        subject_lt = VALUES(subject_lt),
        body_en = VALUES(body_en),
        body_lt = VALUES(body_lt),
        style = VALUES(style)
    `;
    await connection.execute(sql, [t.name, t.category, t.subject_en, t.subject_lt, t.body_en, t.body_lt, t.style]);
    logger.info(`– seeded template ${t.name}`);
  }

  // Seed settings with all the additional columns from migrations
  await connection.execute(`
    INSERT IGNORE INTO settings 
      (site_name, site_description, logo_url, primary_color, secondary_color, accent_color, base_color, font_family,
       venue_name, venue_address, event_start_date, event_end_date, event_time, bride_name, groom_name, 
       contact_email, contact_phone, event_type, dress_code, special_instructions, website_url, app_title)
    VALUES 
      ('Jeff & Brigit Wedding', 'Our special day', '/uploads/logo.png', '#000000', '#ffffff', '#ff6b6b', '#f8f9fa', 'serif',
       'Beautiful Venue', '123 Wedding St, City', '2024-06-15', '2024-06-15', '4:00 PM', 'Brigit', 'Jeff',
       'hello@ourwedding.com', '+1234567890', 'wedding', 'Formal', 'Please arrive 30 minutes early', 'https://ourwedding.com', 'Jeff & Brigit Wedding')
  `);
  logger.info('– seeded settings');

  // Seed example page
  const [pageResult] = await connection.execute(
    `INSERT IGNORE INTO pages (slug, title_en, title_lt, is_published)
     VALUES (?, ?, ?, ?)`,
    ['our-story', 'Our Story', 'Mūsų istorija', 1]
  );
  const [pageRow] = await connection.execute(`SELECT id FROM pages WHERE slug = ?`, ['our-story']);
  const pageId = pageRow[0].id;

  // Seed survey blocks for example page
  const [surveyResEn] = await connection.execute(
    `INSERT IGNORE INTO survey_blocks
      (page_id, type, content, \`order\`, requires_rsvp)
     VALUES (?, ?, ?, ?, ?)`,
    [pageId, 'radio', JSON.stringify({
       question: 'Will you join us for brunch?',
       options: ['Yes', 'No'],
       required: true
     }), 1, false]
  );
  const surveyEnId = surveyResEn.insertId;

  const [surveyResLt] = await connection.execute(
    `INSERT IGNORE INTO survey_blocks
      (page_id, type, content, \`order\`, requires_rsvp)
     VALUES (?, ?, ?, ?, ?)`,
    [pageId, 'radio', JSON.stringify({
       question: 'Ar prisijungsite prie mūsų pusryčių?',
       options: ['Taip', 'Ne'],
       required: true
     }), 2, false]
  );
  const surveyLtId = surveyResLt.insertId;

  // Define updated translation content including survey blocks
  const contentEn = JSON.stringify([
    { type: 'rich-text', html: '<p>We met in 2015, and the rest is history…</p>' },
    { type: 'image', src: '/uploads/story.jpg', alt: 'Us smiling' },
    { type: 'divider' },
    { type: 'map', embed: 'https://maps.google.com/your-venue' },
    { type: 'survey', id: surveyEnId }
  ]);

  const contentLt = JSON.stringify([
    { type: 'rich-text', html: '<p>Susipažinome 2015 metais, o visa kita – istorija…</p>' },
    { type: 'image', src: '/uploads/story.jpg', alt: 'Mes šypsomės' },
    { type: 'divider' },
    { type: 'map', embed: 'https://maps.google.com/your-venue' },
    { type: 'survey', id: surveyLtId }
  ]);

  await connection.execute(
    `INSERT INTO page_translations (page_id, language, title, content)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content)`,
    [pageId, 'en', 'Our Story', contentEn]
  );

  await connection.execute(
    `INSERT INTO page_translations (page_id, language, title, content)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content)`,
    [pageId, 'lt', 'Mūsų istorija', contentLt]
  );

  logger.info('– seeded example page and translations');

  // Seed "All Blocks" test page with every block type
  const [allPageRes] = await connection.execute(
    `INSERT IGNORE INTO pages (slug, title_en, title_lt, is_published)
     VALUES (?, ?, ?, ?)`,
    ['all-blocks', 'All Blocks', 'Visi blokai', 1]
  );
  const [allPageRow] = await connection.execute(
    `SELECT id FROM pages WHERE slug = ?`,
    ['all-blocks']
  );
  const allPageId = allPageRow[0].id;

  // Seed survey blocks for "All Blocks" page
  const [surveyAllEn] = await connection.execute(
    `INSERT IGNORE INTO survey_blocks
      (page_id, type, content, \`order\`)
     VALUES (?, ?, ?, ?)`,
    [allPageId, 'radio', JSON.stringify({
       question: 'Do you like our site?',
       options: ['Option A', 'Option B'],
       required: true
     }), 1]
  );
  const surveyAllEnId = surveyAllEn.insertId;

  const [surveyAllLt] = await connection.execute(
    `INSERT IGNORE INTO survey_blocks
      (page_id, type, content, \`order\`)
     VALUES (?, ?, ?, ?)`,
    [allPageId, 'radio', JSON.stringify({
       question: 'Ar patinka mūsų svetainė?',
       options: ['Parinktis A', 'Parinktis B'],
       required: true
     }), 2]
  );
  const surveyAllLtId = surveyAllLt.insertId;

  // Define translations including all block types
  const allContentEn = JSON.stringify([
    { type: 'rich-text', html: '<p>Welcome to the all-blocks test page.</p>' },
    { type: 'image', src: '/uploads/story.jpg', alt: 'Us smiling' },
    { type: 'video', embed: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    { type: 'map', embed: 'https://maps.google.com/maps?q=London&output=embed' },
    { type: 'divider' },
    { type: 'survey', id: surveyAllEnId }
  ]);
  const allContentLt = JSON.stringify([
    { type: 'rich-text', html: '<p>Sveiki atvykę į puslapį su visais blokais.</p>' },
    { type: 'image', src: '/uploads/story.jpg', alt: 'Mūsų nuotrauka' },
    { type: 'video', embed: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    { type: 'map', embed: 'https://maps.google.com/maps?q=Vilnius&output=embed' },
    { type: 'divider' },
    { type: 'survey', id: surveyAllLtId }
  ]);

  // Insert translations for "All Blocks" page
  await connection.execute(
    `INSERT IGNORE INTO page_translations (page_id, language, title, content)
     VALUES (?, ?, ?, ?)`,
    [allPageId, 'en', 'All Blocks Test', allContentEn]
  );
  await connection.execute(
    `INSERT IGNORE INTO page_translations (page_id, language, title, content)
     VALUES (?, ?, ?, ?)`,
    [allPageId, 'lt', 'Visi blokai', allContentLt]
  );
  logger.info('– seeded "All Blocks" test page and translations');

  await connection.end();
  logger.info('✅ MySQL: users seeded.');
  process.exit(0);
})();