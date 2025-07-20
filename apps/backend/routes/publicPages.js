const express = require('express');
const router = express.Router();
const getDbConnection = require('../db/connection');
const db = getDbConnection();

// GET /api/pages/:slug?locale=en
// Public route to fetch a published page with translation and block info
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const { locale = 'en' } = req.query;

  console.log(`[GET /api/pages/${slug}] Fetching published page with locale=${locale}`);

  try {
    const [pageRows] = await db.query(
      `SELECT * FROM pages WHERE slug = ? AND is_published = 1 LIMIT 1`,
      [slug]
    );

    if (!pageRows.length) {
      console.warn(`[GET /api/pages/${slug}] No published page found for slug=${slug}`);
      return res.status(404).json({ error: 'Page not found or unpublished' });
    }

    const page = pageRows[0];

    const [translationRows] = await db.query(
      `SELECT * FROM page_translations WHERE page_id = ? AND locale = ? LIMIT 1`,
      [page.id, locale]
    );

    let translation = translationRows[0];

    if (!translation) {
      console.warn(`[GET /api/pages/${slug}] Missing translation for locale=${locale}, trying fallback 'en'`);

      const [fallbackRows] = await db.query(
        `SELECT * FROM page_translations WHERE page_id = ? AND locale = 'en' LIMIT 1`,
        [page.id]
      );

      if (!fallbackRows.length) {
        console.warn(`[GET /api/pages/${slug}] No fallback translation found`);
        return res.status(404).json({ error: 'No translation available for this page' });
      }

      translation = fallbackRows[0];
      console.log(`[GET /api/pages/${slug}] Using fallback translation for locale='en'`);
    } else {
      console.log(`[GET /api/pages/${slug}] Found translation for locale=${locale}`);
    }

    res.json({
      ...page,
      translation,
      blocks: [],
      requires_rsvp: page.requires_rsvp,
    });
  } catch (err) {
    console.error(`[GET /api/pages/${slug}] Error:`, err.message, err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;