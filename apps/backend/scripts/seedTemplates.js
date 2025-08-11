#!/usr/bin/env node
// Load environment variables from .env
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const path = require('path');

// Add support for MySQL
let db, runQuery, closeDb;

const templates = [
  {
    name: 'Wedding Invitation',
    subject_en: 'You\'re Invited to Our Wedding, {{guestName}}!',
    subject_lt: 'Jūs esate pakviestas į mūsų vestuves, {{guestName}}!',
    body_en: `Dear {{guestName}},

We are delighted to invite you to celebrate our wedding with us!

**Wedding Details:**
{{#if weddingDate}}
**Date:** {{weddingDate}}
{{/if}}
{{#if venueName}}
**Venue:** {{venueName}}
{{/if}}
{{#if venueAddress}}
**Address:** {{venueAddress}}
{{/if}}
{{#if eventTime}}
**Time:** {{eventTime}}
{{/if}}

{{#if hasPlusOne}}
You are welcome to bring a plus one: {{plusOneName}}
{{/if}}

**Please RSVP:** We kindly request your response by {{rsvpDeadline}} to help us plan our special day.

**RSVP Link:** {{rsvpLink}}

We can't wait to celebrate with you!

Best regards,
{{brideName}} & {{groomName}}`,
    body_lt: `Brangus {{guestName}},

Mums labai malonu pakviesti jus švęsti mūsų vestuves!

**Vestuvių informacija:**
{{#if weddingDate}}
**Data:** {{weddingDate}}
{{/if}}
{{#if venueName}}
**Vieta:** {{venueName}}
{{/if}}
{{#if venueAddress}}
**Adresas:** {{venueAddress}}
{{/if}}
{{#if eventTime}}
**Laikas:** {{eventTime}}
{{/if}}

{{#if hasPlusOne}}
Galite atsinešti svečią: {{plusOneName}}
{{/if}}

**Prašome RSVP:** Maloniai prašome atsakyti iki {{rsvpDeadline}}, kad galėtume planuoti mūsų ypatingą dieną.

**RSVP nuoroda:** {{rsvpLink}}

Nekantriai laukiame švęsti su jumis!

Su meile,
{{brideName}} & {{groomName}}`,
    style: 'elegant',
    category: 'invitation'
  },
  {
    name: 'Thank You - Attending',
    subject_en: 'Thank you for your RSVP, {{guestName}}!',
    subject_lt: 'Ačiū už jūsų RSVP, {{guestName}}!',
    body_en: `Dear {{guestName}},

Thank you so much for confirming your attendance at our wedding!

{{#if hasPlusOne}}
We're delighted that {{plusOneName}} will also be joining us!
{{/if}}

{{#if dietary}}
We've noted your dietary preference: {{dietary}}
{{/if}}

{{#if notes}}
Thank you for your note: "{{notes}}"
{{/if}}

We're looking forward to celebrating with you on our special day!

Best regards,
{{brideName}} & {{groomName}}`,
    body_lt: `Brangus {{guestName}},

Labai ačiū, kad patvirtinote savo dalyvavimą mūsų vestuvėse!

{{#if hasPlusOne}}
Mums labai malonu, kad {{plusOneName}} taip pat prisijungs prie mūsų!
{{/if}}

{{#if dietary}}
Pastebėjome jūsų mitybos pageidavimą: {{dietary}}
{{/if}}

{{#if notes}}
Ačiū už jūsų pastabą: "{{notes}}"
{{/if}}

Nekantriai laukiame švęsti su jumis mūsų ypatingoje dienoje!

Su meile,
{{brideName}} & {{groomName}}`,
    style: 'friendly',
    category: 'confirmation'
  },
  {
    name: 'Thank You - Not Attending',
    subject_en: 'Thank you for your RSVP, {{guestName}}',
    subject_lt: 'Ačiū už jūsų RSVP, {{guestName}}',
    body_en: `Dear {{guestName}},

Thank you for letting us know that you won't be able to attend our wedding.

{{#if notes}}
We appreciate your note: "{{notes}}"
{{/if}}

We understand and will miss you on our special day. We hope to celebrate with you on another occasion!

Best regards,
{{brideName}} & {{groomName}}`,
    body_lt: `Brangus {{guestName}},

Ačiū, kad pranešėte, kad negalėsite dalyvauti mūsų vestuvėse.

{{#if notes}}
Vertiname jūsų pastabą: "{{notes}}"
{{/if}}

Suprantame ir mums trūks jūsų mūsų ypatingoje dienoje. Tikimės švęsti su jumis kitu atveju!

Su meile,
{{brideName}} & {{groomName}}`,
    style: 'friendly',
    category: 'confirmation'
  },
  {
    name: 'RSVP Reminder',
    subject_en: 'Friendly RSVP Reminder, {{guestName}}',
    subject_lt: 'Draugiškas RSVP priminimas, {{guestName}}',
    body_en: `Dear {{guestName}},

This is a friendly reminder about RSVPing for our wedding!

{{#if rsvpDeadline}}
**RSVP Deadline:** {{rsvpDeadline}}
{{/if}}

{{#if isPending}}
You haven't responded yet. Please let us know if you can attend!
{{/if}}

{{#if hasResponded}}
Thank you for your response! We're looking forward to celebrating with you.
{{/if}}

{{#if isAttending}}
We're thrilled you'll be joining us!
{{/if}}

{{#if isNotAttending}}
We understand and will miss you on our special day.
{{/if}}

**RSVP Link:** {{rsvpLink}}

Best regards,
{{brideName}} & {{groomName}}`,
    body_lt: `Brangus {{guestName}},

Tai draugiškas priminimas apie RSVP mūsų vestuvėms!

{{#if rsvpDeadline}}
**RSVP terminas:** {{rsvpDeadline}}
{{/if}}

{{#if isPending}}
Jūs dar neatsakėte. Prašome pranešti, ar galite dalyvauti!
{{/if}}

{{#if hasResponded}}
Ačiū už jūsų atsakymą! Nekantriai laukiame švęsti su jumis.
{{/if}}

{{#if isAttending}}
Mums labai malonu, kad prisijungsite!
{{/if}}

{{#if isNotAttending}}
Suprantame ir mums trūks jūsų mūsų ypatingoje dienoje.
{{/if}}

**RSVP nuoroda:** {{rsvpLink}}

Su meile,
{{brideName}} & {{groomName}}`,
    style: 'friendly',
    category: 'reminder'
  }
];

async function initializeDatabase() {
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
    runQuery = async (sql, params = []) => {
      // Convert undefined parameters to null for MySQL binding
      const safeParams = params.map(p => p === undefined ? null : p);
      const [result] = await db.execute(sql, safeParams);
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
}

async function seedTemplates() {
  try {
    await initializeDatabase();
    
    const logger = require('../helpers/logger');
    logger.info('🌱 Starting template seeder...');
    logger.info('️ Clearing ALL existing templates...');
    
    // Clear ALL existing templates (not just specific names)
    const clearSql = process.env.DB_TYPE === 'mysql'
      ? 'DELETE FROM templates'
      : 'DELETE FROM templates';
    
    await runQuery(clearSql);
    logger.info('✅ All existing templates cleared.');
    
    logger.info('🌱 Inserting pre-built templates...');
    
    // Insert new templates
    for (const template of templates) {
      const insertSql = process.env.DB_TYPE === 'mysql'
        ? 'INSERT INTO templates (name, subject_en, subject_lt, body_en, body_lt, style, category) VALUES (?, ?, ?, ?, ?, ?, ?)'
        : 'INSERT INTO templates (name, subject_en, subject_lt, body_en, body_lt, style, category) VALUES (?, ?, ?, ?, ?, ?, ?)';
      
      const params = [
        template.name,
        template.subject_en,
        template.subject_lt,
        template.body_en,
        template.body_lt,
        template.style,
        template.category
      ];
      
      await runQuery(insertSql, params);
      logger.info(`✅ Template "${template.name}" inserted.`);
    }
    
    logger.info('🎉 Template seeding completed successfully!');
    
  } catch (error) {
    const logger = require('../helpers/logger');
    logger.error('❌ Template seeder failed:', error);
    throw error;
  } finally {
    if (closeDb) {
      await closeDb();
    }
  }
}

// Run the seeder if this file is executed directly
if (require.main === module) {
  seedTemplates()
    .then(() => {
      console.log('✅ Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedTemplates };