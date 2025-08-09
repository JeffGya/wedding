#!/usr/bin/env node
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');
const logger = require('../helpers/logger');
const { sendScheduledMessages } = require('../helpers/sendScheduledMessages');

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  const guestId = process.env.SMOKE_GUEST_ID || 1;
  const pastUtc = new Date(Date.now() - 60_000).toISOString();
  logger.info(`⏱ Inserting smoke‐test message at UTC ${pastUtc}`);

  const [res] = await db.execute(
    `INSERT INTO messages (subject, body_en, body_lt, status, scheduled_for, style)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [`SmokeTest ${new Date().toISOString()}`, 'Smoke EN', 'Smoke LT', 'scheduled', pastUtc, 'elegant']
  );
  const messageId = res.insertId;

  await db.execute(
    `INSERT INTO message_recipients (message_id, guest_id, email, language)
     SELECT ?, id, email, preferred_language FROM guests WHERE id = ?`,
    [messageId, guestId]
  );
  logger.info(`✅ Set up message ${messageId} for guest ${guestId}`);

  try {
    await sendScheduledMessages();
    logger.info('✅ sendScheduledMessages() completed');

    const [rows] = await db.execute(
      `SELECT delivery_status, resend_message_id, sent_at 
       FROM message_recipients WHERE message_id = ?`,
      [messageId]
    );
    logger.info('📊 Smoke-test results:');
    // Note: Avoid console.table; log summary instead
    logger.info(JSON.stringify(rows));
    process.exit(0);
  } catch (err) {
    logger.error('❌ sendScheduledMessages() error:', err);
    process.exit(1);
  }
})();