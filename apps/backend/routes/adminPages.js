const express = require('express');
const router = express.Router();

const Page = require('../db/models/pages');
const PageTranslation = require('../db/models/pageTranslation');

// GET /api/pages — fetch all pages
router.get('/', async (req, res) => {
  try {
    console.log('[GET /api/pages] Fetching all pages...');
    const pages = await Page.getAll();
    console.log('[GET /api/pages] Pages fetched:', pages);
    res.json(pages);
  } catch (err) {
    console.error('[GET /api/pages] Error:', err.message, err.stack);
    res.status(500).json({ error: `Failed to fetch pages: ${err.message}` });
  }
});

// GET /api/pages/:id — fetch a single page with its translations
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    console.log(`[GET /api/pages/${id}] Fetching page and translations...`);
    const page = await Page.getById(id);
    const translations = await PageTranslation.getAllByPageId(id);
    res.json({ ...page, translations });
  } catch (err) {
    console.error(`[GET /api/pages/${req.params.id}] Error:`, err.message, err.stack);
    res.status(500).json({ error: `Failed to fetch page: ${err.message}` });
  }
});

// POST /api/pages — create a new page and add translations
router.post('/', async (req, res) => {
  try {
    const {
      slug,
      is_published,
      requires_rsvp,
      show_in_nav,
      nav_order,
      translations = [],
    } = req.body;

    console.log('[POST /api/pages] Request body:', req.body);

    const newPage = await Page.create({
      slug,
      is_published,
      requires_rsvp,
      show_in_nav,
      nav_order,
    });

    console.log('[POST /api/pages] Created page:', newPage);

    for (const translation of translations) {
      const { locale, title, content } = translation;
      console.log('[POST /api/pages] Processing translation:', translation);

      if (!locale || !title || typeof content === 'undefined') {
        console.warn('[POST /api/pages] Skipping invalid translation:', translation);
        continue;
      }

      await PageTranslation.create({
        page_id: newPage.id,
        locale,
        title,
        content: Array.isArray(content) ? content : [],
      });

      console.log(`[POST /api/pages] Translation saved for locale: ${locale}`);
    }

    res.status(201).json(newPage);
  } catch (err) {
    console.error('[POST /api/pages] Error creating page:', err.message, err.stack);
    if (err.message.includes('UNIQUE constraint failed') || err.message.includes('duplicate key')) {
      return res.status(400).json({ error: 'Slug already exists. Please use a unique slug.' });
    }
    res.status(500).json({ error: `Failed to create page: ${err.message}` });
  }
});

// PUT /api/pages/:id — update main page fields and translations
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const {
      slug,
      is_published,
      requires_rsvp,
      show_in_nav,
      nav_order,
      translations = [],
    } = req.body;

    console.log(`[PUT /api/pages/${id}] Updating page...`, req.body);

    // Check if page exists
    const page = await Page.getById(id);
    if (!page) {
      console.warn(`[PUT /api/pages/${id}] Page not found.`);
      return res.status(404).json({ error: 'Page not found' });
    }

    await Page.update(id, {
      slug,
      is_published,
      requires_rsvp,
      show_in_nav,
      nav_order,
    });
    console.log(`[PUT /api/pages/${id}] Page updated.`);

    // Update or insert translations
    for (const translation of translations) {
      const { locale, title, content } = translation;
      console.log(`[PUT /api/pages/${id}] Processing translation for ${locale}...`, translation);

      if (!locale || !title || typeof content === 'undefined') {
        console.warn(`[PUT /api/pages/${id}] Skipping invalid translation:`, translation);
        continue;
      }

      // Check if translation exists for this page and locale
      const existing = await PageTranslation.getByPageIdAndLocale(id, locale);
      if (existing) {
        await PageTranslation.update(existing.id, {
          title,
          content: Array.isArray(content) ? content : [],
        });
        console.log(`[PUT /api/pages/${id}] Updated translation for locale: ${locale}`);
      } else {
        await PageTranslation.create({
          page_id: id,
          locale,
          title,
          content: Array.isArray(content) ? content : [],
        });
        console.log(`[PUT /api/pages/${id}] Created translation for locale: ${locale}`);
      }
    }

    res.json({ message: 'Page and translations updated' });
  } catch (err) {
    console.error(`[PUT /api/pages/${req.params.id}] Error:`, err.message, err.stack);
    res.status(500).json({ error: `Failed to update page: ${err.message}` });
  }
});

// DELETE /api/pages/:id — delete page and its translations
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    console.log(`[DELETE /api/pages/${id}] Deleting page and translations...`);
    await PageTranslation.deleteAllByPageId(id);
    await Page.remove(id);
    res.status(204).end();
  } catch (err) {
    console.error(`[DELETE /api/pages/${req.params.id}] Error:`, err.message, err.stack);
    res.status(500).json({ error: `Failed to delete page: ${err.message}` });
  }
});

module.exports = router;