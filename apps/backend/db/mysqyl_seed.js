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

  const contentEn = JSON.stringify([
    { type: 'richText', content: '<p>We met in 2015, and the rest is history…</p>' },
    { type: 'image', url: '/uploads/story.jpg', alt: 'Us smiling' },
    { type: 'divider' },
    { type: 'map', embedUrl: 'https://maps.google.com/your-venue' }
  ]);

  const contentLt = JSON.stringify([
    { type: 'richText', content: '<p>Susipažinome 2015 metais, o visa kita – istorija…</p>' },
    { type: 'image', url: '/uploads/story.jpg', alt: 'Mes šypsomės' },
    { type: 'divider' },
    { type: 'map', embedUrl: 'https://maps.google.com/your-venue' }
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

  await connection.end();
  console.log('✅ MySQL: users seeded.');
  process.exit(0);
})();