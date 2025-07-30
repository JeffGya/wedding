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

  console.log('Seeding into database:', process.env.DB_NAME);
  await connection.query(`USE \`${process.env.DB_NAME}\``);

  // Define your users to seed
  const users = [
    { name: 'Future Husband Jeffrey', email: 'jeffogya@gmail.com', password: 'Fbjqp4H6woww9' },
    { name: 'Future Wife Brigita', email: 'brigitabruno@gmail.com', password: '6B2jt5qy8WHqm' }
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const sql = `
      INSERT IGNORE INTO users (name, email, passwordHash)
      VALUES (?, ?, ?)
    `;
    await connection.execute(sql, [u.name, u.email, hash]);
    console.log(`– inserted user ${u.email}`);
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
    console.log(`– seeded email_settings for provider ${e.provider}`);
  }

  // Seed templates
  const templates = [
    {
      name: 'rsvp_request',
      subject: 'Please RSVP for our wedding!',
      body_en: 'Hey {{name}}, please let us know if you can make it …',
      html: '<p>Hey <strong>{{name}}</strong>, please let us know if you can make it …</p>'
    }
  ];

  for (const t of templates) {
    const sql = `
      INSERT INTO templates
        (name, subject, body_en, html)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        subject = VALUES(subject),
        body_en = VALUES(body_en),
        html = VALUES(html)
    `;
    await connection.execute(sql, [t.name, t.subject, t.body_en, t.html]);
    console.log(`– seeded template ${t.name}`);
  }

  // Seed example page and translations
  const [pageResult] = await connection.execute(
    `INSERT IGNORE INTO pages (slug, is_published, requires_rsvp, show_in_nav, nav_order)
     VALUES (?, ?, ?, ?, ?)`,
    ['our-story', 1, 0, 1, 1]
  );
  const [pageRow] = await connection.execute(`SELECT id FROM pages WHERE slug = ?`, ['our-story']);
  const pageId = pageRow[0].id;

  // Seed survey blocks for example page
  const [surveyResEn] = await connection.execute(
    `INSERT IGNORE INTO survey_blocks
      (page_id, locale, question, type, options, is_required, is_anonymous)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [pageId, 'en', 'Will you join us for brunch?', 'radio',
     JSON.stringify(['Yes', 'No']), 1, 0]
  );
  const surveyEnId = surveyResEn.insertId;

  const [surveyResLt] = await connection.execute(
    `INSERT IGNORE INTO survey_blocks
      (page_id, locale, question, type, options, is_required, is_anonymous)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [pageId, 'lt', 'Ar prisijungsite prie mūsų pusryčių?', 'radio',
     JSON.stringify(['Taip', 'Ne']), 1, 0]
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
    `INSERT INTO page_translations (page_id, locale, title, content)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content)`,
    [pageId, 'en', 'Our Story', contentEn]
  );

  await connection.execute(
    `INSERT INTO page_translations (page_id, locale, title, content)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content)`,
    [pageId, 'lt', 'Mūsų istorija', contentLt]
  );

  console.log('– seeded example page and translations');

  // Seed "All Blocks" test page with every block type
  const [allPageRes] = await connection.execute(
    `INSERT IGNORE INTO pages (slug, is_published, requires_rsvp, show_in_nav, nav_order)
     VALUES (?, ?, ?, ?, ?)`,
    ['all-blocks', 1, 0, 0, 99]
  );
  const [allPageRow] = await connection.execute(
    `SELECT id FROM pages WHERE slug = ?`,
    ['all-blocks']
  );
  const allPageId = allPageRow[0].id;

  // Seed survey blocks for "All Blocks" page
  const [surveyAllEn] = await connection.execute(
    `INSERT IGNORE INTO survey_blocks
      (page_id, locale, question, type, options, is_required, is_anonymous)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [allPageId, 'en', 'Do you like our site?', 'radio',
     JSON.stringify(['Option A', 'Option B']), 1, 0]
  );
  const surveyAllEnId = surveyAllEn.insertId;

  const [surveyAllLt] = await connection.execute(
    `INSERT IGNORE INTO survey_blocks
      (page_id, locale, question, type, options, is_required, is_anonymous)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [allPageId, 'lt', 'Ar patinka mūsų svetainė?', 'radio',
     JSON.stringify(['Parinktis A', 'Parinktis B']), 1, 0]
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
    `INSERT IGNORE INTO page_translations (page_id, locale, title, content)
     VALUES (?, ?, ?, ?)`,
    [allPageId, 'en', 'All Blocks Test', allContentEn]
  );
  await connection.execute(
    `INSERT IGNORE INTO page_translations (page_id, locale, title, content)
     VALUES (?, ?, ?, ?)`,
    [allPageId, 'lt', 'Visi blokai', allContentLt]
  );
  console.log('– seeded "All Blocks" test page and translations');

  await connection.end();
  console.log('✅ MySQL: users seeded.');
  process.exit(0);
})();