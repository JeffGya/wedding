const express = require('express');
const getDbConnection = require('../db/connection');
const db = getDbConnection();
let dbGet, dbAll, dbRun;

if (process.env.DB_TYPE === 'mysql') {
  dbGet = async (sql, params) => {
    const [rows] = await db.query(sql, params);
    return rows[0];
  };
  dbAll = async (sql, params) => {
    const [rows] = await db.query(sql, params);
    return rows;
  };
  dbRun = async (sql, params) => {
    const [result] = await db.query(sql, params);
    return result;
  };
} else {
  const util = require('util');
  dbGet = util.promisify(db.get).bind(db);
  dbAll = util.promisify(db.all).bind(db);
  dbRun = util.promisify(db.run).bind(db);
}

const router = express.Router();

// GET a public page by slug and locale, enforcing RSVP gating
router.get('/:slug', async (req, res) => {
  const slug = req.params.slug;
  const locale = req.query.locale || 'en';
  const guest = req.guest || null;

  console.log(`[GET /api/pages/${slug}] Fetching published page with locale=${locale}`);
  console.log(`[GET /api/pages/${slug}] guestId: ${guest?.id || ''}`);
  console.log(`[GET /api/pages/${slug}] Session: ${JSON.stringify(req.signedCookies || {})}`);

  try {
    // Step 1: Get page
    let page;
    try {
      page = await dbGet(
        'SELECT * FROM pages WHERE slug = ? AND is_published = 1',
        [slug]
      );
    } catch (err) {
      console.error(`[GET /api/pages/${slug}] ❌ Error fetching page:`, err?.stack || err);
      return res.status(500).json({ error: 'Database error fetching page' });
    }

    if (!page) return res.status(404).json({ error: 'Page not found or unpublished' });
    console.log(`[GET /api/pages/${slug}] → Found page:`, page);

    // Step 2: Get page translation for locale
    console.log(`[GET /api/pages/${slug}] → Looking for translation in locale: ${locale}`);
    let translation;
    try {
      translation = await dbGet(
        'SELECT * FROM page_translations WHERE page_id = ? AND locale = ?',
        [page.id, locale]
      );
    } catch (err) {
      console.error(`[GET /api/pages/${slug}] ❌ Error fetching translation:`, err?.stack || err);
      return res.status(500).json({ error: 'Database error fetching translation' });
    }

    console.log(`[GET /api/pages/${slug}] → Translation result:`, translation);
    if (!translation) return res.status(404).json({ error: 'Translation not found for requested locale' });

    if (!translation.content) {
      console.error(`[GET /api/pages/${slug}] ⚠️ Missing content in translation object`);
      return res.status(500).json({ error: 'Missing content in translation' });
    }

    console.log(`[GET /api/pages/${slug}] Found translation for locale=${locale}`);

    // Step 3: Enforce RSVP requirement
    if (page.requires_rsvp) {
      if (!guest || guest.rsvp_status === 'pending') {
        return res.status(403).json({ error: 'RSVP required to view this page' });
      }
    }

    // Step 4: Parse content safely
    let parsedContent;
    try {
      if (typeof translation.content === 'string') {
        parsedContent = JSON.parse(translation.content);
      } else {
        parsedContent = translation.content;
      }
    } catch (err) {
      console.log(`[GET /api/pages/${slug}] Failed to parse content JSON: ${translation.content}`);
      return res.status(500).json({ error: 'Invalid page content format' });
    }

    console.log(`[GET /api/pages/${slug}] ✅ Parsed content successfully`);

    return res.json({
      slug: page.slug,
      locale: translation.locale,
      title: translation.title,
      content: parsedContent
    });
  } catch (err) {
    console.error(`[GET /api/pages/${slug}] Unexpected error:\n`, util.inspect(err, { depth: null }));
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;