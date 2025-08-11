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
    logger.info(`– inserted user ${u.email}`);
  }

  // Seed email_settings
  const emailSettings = [
    {
      provider: 'resend',
      api_key: 'YOUR_REAL_API_KEY',
      from_name: 'Jeffrey & Brigita',
      from_email: 'hello@ourwedding.com',
      sender_name: 'Jeffrey & Brigita',
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
      subject_en: 'Please RSVP for our wedding!',
      subject_lt: 'Prašome RSVP mūsų vestuvėms!',
      body_en: 'Hey {{name}}, please let us know if you can make it to our special day!',
      body_lt: 'Labas {{name}}, prašome pranešti, ar galite atvykti į mūsų ypatingą dieną!',
      style: 'elegant',
      category: 'rsvp'
    }
  ];

  for (const t of templates) {
    const sql = `
      INSERT INTO templates
        (name, subject_en, subject_lt, body_en, body_lt, style, category)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        subject_en = VALUES(subject_en),
        subject_lt = VALUES(subject_lt),
        body_en = VALUES(body_en),
        body_lt = VALUES(body_lt),
        style = VALUES(style),
        category = VALUES(category)
    `;
    await connection.execute(sql, [t.name, t.subject_en, t.subject_lt, t.body_en, t.body_lt, t.style, t.category]);
    logger.info(`– seeded template ${t.name}`);
  }

  // Seed basic settings - minimal essential info
  await connection.execute(`
    INSERT IGNORE INTO settings 
      (id, enable_global_countdown, wedding_date, venue_name, venue_address, event_start_date, event_end_date, event_time,
       bride_name, groom_name, contact_email, contact_phone, event_type, dress_code, special_instructions, website_url, app_title, created_at, updated_at)
    VALUES 
      (1, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  logger.info('– seeded basic settings');

  // Seed one example page to test the system
  const [pageResult] = await connection.execute(
    `INSERT IGNORE INTO pages (slug, title_en, title_lt, is_published, show_in_nav, nav_order, requires_rsvp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['our-story', 'Our Story', 'Mūsų istorija', 1, 1, 1, false]
  );
  const [pageRow] = await connection.execute(`SELECT id FROM pages WHERE slug = ?`, ['our-story']);
  const pageId = pageRow[0].id;

  // Seed one example survey block to test the system
  await connection.execute(
    `INSERT IGNORE INTO survey_blocks
       (page_id, locale, type, question, options, is_required, is_anonymous, requires_rsvp, block_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [pageId, 'en', 'radio', 'Will you join us for brunch?', JSON.stringify(['Yes', 'No']), 1, 0, false, 0]
  );
  logger.info('– seeded example page and survey block');

  await connection.end();
  logger.info('✅ Seeding completed successfully');
})().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});