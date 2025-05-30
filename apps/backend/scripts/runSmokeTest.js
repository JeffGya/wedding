#!/usr/bin/env node
// Load environment variables from .env
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const getDbConnection = require('../db/connection');
const { sendScheduledMessages } = require('../helpers/sendScheduledMessages');

(async () => {
  const db = getDbConnection();
  const guestId = process.env.SMOKE_GUEST_ID || 1;
  // schedule one minute in the past to ensure it's due
  const pastUtc = new Date(Date.now() - 60_000).toISOString();
  console.log(`⏱ Inserting smoke‐test message at UTC ${pastUtc}`);

  let messageId;
  try {
    messageId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO messages (subject, body_en, body_lt, status, scheduled_for)
         VALUES (?, ?, ?, ?, ?)`,
        [
          `SmokeTest ${new Date().toISOString()}`,
          'Smoke EN',
          'Smoke LT',
          'scheduled',
          pastUtc
        ],
        function (err) {
          err ? reject(err) : resolve(this.lastID);
        }
      );
    });
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO message_recipients (message_id, guest_id, email, language)
         SELECT ?, id, email, preferred_language FROM guests WHERE id = ?`,
        [messageId, guestId],
        err => err ? reject(err) : resolve()
      );
    });
    console.log(`✅ Set up message ${messageId} for guest ${guestId}`);
  } catch (err) {
    console.error('❌ Smoke-test setup failed:', err);
    process.exit(1);
  }

  try {
    await sendScheduledMessages();
    console.log('✅ sendScheduledMessages() completed');
    db.all(
      `SELECT delivery_status, resend_message_id, sent_at 
       FROM message_recipients WHERE message_id = ?`,
      [messageId],
      (err, rows) => {
        if (err) {
          console.error('❌ Error fetching results:', err);
          process.exit(1);
        }
        console.log('📊 Smoke-test results:');
        console.table(rows);
        process.exit(0);
      }
    );
  } catch (err) {
    console.error('❌ sendScheduledMessages() error:', err);
    process.exit(1);
  }
})();