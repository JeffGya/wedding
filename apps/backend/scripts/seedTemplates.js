#!/usr/bin/env node
// Load environment variables from .env
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const path = require('path');

// Add support for MySQL
let db, runQuery, closeDb;

const templates = [
  {
    name: 'Welcome Message',
    subject: 'Welcome to our wedding celebration, {{guestName}}!',
    body_en: `Dear {{guestName}},

We are thrilled to invite you to our special day!

**Event Details:**
- **Date:** {{eventStartDate}}
- **Venue:** {{venueName}}
- **Time:** {{eventStartTime}}

We can't wait to celebrate with you!

Best regards,
{{brideName}} & {{groomName}}`,
    body_lt: `Brangus {{guestName}},

Mums džiaugiamės kviesdami jus į mūsų ypatingą dieną!

**Renginio informacija:**
- **Data:** {{eventStartDate}}
- **Vieta:** {{venueName}}
- **Laikas:** {{eventStartTime}}

Nekantriai laukiame švęsti su jumis!

Su meile,
{{brideName}} & {{groomName}}`,
    style: 'friendly'
  },
  {
    name: 'RSVP Reminder',
    subject: 'Please RSVP for our wedding, {{guestName}}',
    body_en: `Dear {{guestName}},

This is a friendly reminder to RSVP for our wedding celebration.

**RSVP Deadline:** {{rsvpDeadline}}

Please visit our wedding website to confirm your attendance.

We look forward to hearing from you!

Best regards,
{{brideName}} & {{groomName}}`,
    body_lt: `Brangus {{guestName}},

Tai draugiškas priminimas apie RSVP mūsų vestuvėms.

**RSVP terminas:** {{rsvpDeadline}}

Apsilankykite mūsų vestuvių svetainėje, kad patvirtintumėte savo dalyvavimą.

Nekantriai laukiame jūsų atsakymo!

Su meile,
{{brideName}} & {{groomName}}`,
    style: 'modern'
  },
  {
    name: 'Wedding Update',
    subject: 'Important wedding update, {{guestName}}',
    body_en: `Dear {{guestName}},

We have an important update about our wedding celebration.

**Update Details:**
{{updateDetails}}

If you have any questions, please don't hesitate to contact us.

Thank you for your understanding!

Best regards,
{{brideName}} & {{groomName}}`,
    body_lt: `Brangus {{guestName}},

Turime svarbų atnaujinimą apie mūsų vestuvių šventę.

**Atnaujinimo informacija:**
{{updateDetails}}

Jei turite klausimų, nedvejodami susisiekite su mumis.

Ačiū už supratimą!

Su meile,
{{brideName}} & {{groomName}}`,
    style: 'elegant'
  },
  {
    name: 'Thank You - Attending',
    subject: 'Thank you for your RSVP, {{guestName}}!',
    body_en: `Dear {{guestName}},

Thank you so much for confirming your attendance at our wedding!

We are thrilled that you'll be joining us on our special day.

**Event Details:**
- **Date:** {{eventStartDate}}
- **Venue:** {{venueName}}
- **Time:** {{eventStartTime}}

We can't wait to celebrate with you!

Best regards,
{{brideName}} & {{groomName}}`,
    body_lt: `Brangus {{guestName}},

Labai ačiū, kad patvirtinote savo dalyvavimą mūsų vestuvėse!

Mums labai malonu, kad prisijungsite prie mūsų ypatingos dienos.

**Renginio informacija:**
- **Data:** {{eventStartDate}}
- **Vieta:** {{venueName}}
- **Laikas:** {{eventStartTime}}

Nekantriai laukiame švęsti su jumis!

Su meile,
{{brideName}} & {{groomName}}`,
    style: 'friendly'
  },
  {
    name: 'Thank You - Not Attending',
    subject: 'Thank you for your RSVP, {{guestName}}',
    body_en: `Dear {{guestName}},

Thank you for letting us know that you won't be able to attend our wedding.

We understand and appreciate you taking the time to respond.

We'll miss you on our special day, but we hope to see you soon!

Best regards,
{{brideName}} & {{groomName}}`,
    body_lt: `Brangus {{guestName}},

Ačiū, kad pranešėte, kad negalėsite dalyvauti mūsų vestuvėse.

Suprantame ir vertiname, kad skyrėte laiko atsakyti.

Mums trūks jūsų mūsų ypatingoje dienoje, bet tikimės susitikti netrukus!

Su meile,
{{brideName}} & {{groomName}}`,
    style: 'modern'
  },
  {
    name: 'Group-Specific Welcome',
    subject: 'Special welcome for {{groupLabel}}, {{guestName}}!',
    body_en: `Dear {{guestName}},

As a member of {{groupLabel}}, we wanted to send you a special welcome message!

We're so excited to have you join us for our wedding celebration.

**Special Information for {{groupLabel}}:**
{{#if groupLabel === 'Bride\\'s Family'}}
- Special family photo session at 4:30 PM
- Reserved seating in the front rows
{{else if groupLabel === 'Groom\\'s Family'}}
- Special family photo session at 4:30 PM
- Reserved seating in the front rows
{{else if groupLabel === 'Bride\\'s Friends'}}
- Pre-wedding gathering at 3:00 PM
- Casual dress code for the gathering
{{else if groupLabel === 'Groom\\'s Friends'}}
- Pre-wedding gathering at 3:00 PM
- Casual dress code for the gathering
{{else}}
- General guest information will be provided
{{/if}}

We can't wait to see you!

Best regards,
{{brideName}} & {{groomName}}`,
    body_lt: `Brangus {{guestName}},

Kaip {{groupLabel}} nariui, norėjome išsiųsti jums specialų pasveikinimą!

Mums labai malonu, kad prisijungsite prie mūsų vestuvių šventės.

**Speciali informacija {{groupLabel}}:**
{{#if groupLabel === 'Bride\\'s Family'}}
- Speciali šeimos nuotraukų sesija 16:30
- Rezervuotos vietos priekinėse eilėse
{{else if groupLabel === 'Groom\\'s Family'}}
- Speciali šeimos nuotraukų sesija 16:30
- Rezervuotos vietos priekinėse eilėse
{{else if groupLabel === 'Bride\\'s Friends'}}
- Išankstinis susirinkimas 15:00
- Kasualus drabužių kodas susirinkimui
{{else if groupLabel === 'Groom\\'s Friends'}}
- Išankstinis susirinkimas 15:00
- Kasualus drabužių kodas susirinkimui
{{else}}
- Bus pateikta bendra svečių informacija
{{/if}}

Nekantriai laukiame susitikimo!

Su meile,
{{brideName}} & {{groomName}}`,
    style: 'friendly'
  },
  {
    name: 'Travel Information',
    subject: 'Travel information for our wedding, {{guestName}}',
    body_en: `Dear {{guestName}},

Here's some helpful travel information for our wedding:

**Venue Address:**
{{venueName}}
{{venueAddress}}

**Getting There:**
- By car: {{#if parking}}Parking available on site{{else}}Street parking available{{/if}}
- By public transport: {{#if publicTransport}}Nearest station: {{nearestStation}}{{else}}Limited public transport{{/if}}

**Accommodation:**
{{#if nearbyHotels}}
Nearby hotels:
{{nearbyHotels}}
{{/if}}

We can't wait to see you!

Best regards,
{{brideName}} & {{groomName}}`,
    body_lt: `Brangus {{guestName}},

Štai naudinga kelionės informacija mūsų vestuvėms:

**Vietos adresas:**
{{venueName}}
{{venueAddress}}

**Kaip patekti:**
- Automobiliu: {{#if parking}}Stovėjimo aikštelė vietoje{{else}}Stovėjimas gatvėje{{/if}}
- Viešuoju transportu: {{#if publicTransport}}Artimiausia stotis: {{nearestStation}}{{else}}Ribotas viešasis transportas{{/if}}

**Apgyvendinimas:**
{{#if nearbyHotels}}
Artimiausi viešbučiai:
{{nearbyHotels}}
{{/if}}

Nekantriai laukiame susitikimo!

Su meile,
{{brideName}} & {{groomName}}`,
    style: 'elegant'
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
    logger.info('️ Clearing existing templates...');
    
    // Clear existing templates
    const clearSql = process.env.DB_TYPE === 'mysql'
      ? 'DELETE FROM templates WHERE name IN (?, ?, ?, ?, ?, ?, ?)'
      : 'DELETE FROM templates WHERE name IN (?, ?, ?, ?, ?, ?, ?)';
    
    const templateNames = templates.map(t => t.name);
    await runQuery(clearSql, templateNames);
    
    logger.info('✅ Existing templates cleared.');
    
    // Insert new templates
    logger.info('🌱 Inserting pre-built templates...');
    
    for (const template of templates) {
      const insertSql = process.env.DB_TYPE === 'mysql'
        ? `INSERT INTO templates (name, subject_en, subject_lt, body_en, body_lt, style, category) VALUES (?, ?, ?, ?, ?, ?, ?)`
        : 'INSERT INTO templates (name, subject_en, subject_lt, body_en, body_lt, style, category) VALUES (?, ?, ?, ?, ?, ?, ?)';
      
      await runQuery(insertSql, [
        template.name,
        template.subject,  // Use for subject_en
        template.subject,  // Use for subject_lt (same value for both languages)
        template.body_en,
        template.body_lt,
        template.style,
        'general'  // Default category since it's required
      ]);
      
      logger.info(`✅ Added template: ${template.name}`);
    }
    
    logger.info('🎉 Template seeding completed successfully!');
    logger.info(`📧 Added ${templates.length} pre-built templates:`);
    templates.forEach(t => logger.info(`   - ${t.name}`));
    
  } catch (error) {
    const logger2 = require('../helpers/logger');
    logger2.error('❌ Template seeder failed:', error);
    throw error;
  } finally {
    if (closeDb) {
      await closeDb();
    }
  }
}

// Export the function for use in other modules
module.exports = { seedTemplates };

// If this file is run directly, execute the seeding
if (require.main === module) {
  const logger = require('../helpers/logger');
  logger.info('🌱 Starting template seeder...');
  seedTemplates()
    .then(() => {
      logger.info('✅ Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}