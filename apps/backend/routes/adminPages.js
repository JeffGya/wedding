const express = require('express');
const router = express.Router();

const Page = require('../db/models/pages');
const PageTranslation = require('../db/models/pageTranslation');

// GET /api/pages — fetch all pages
router.get('/', async (req, res) => {
  try {
    console.log('[GET /api/pages] Fetching all pages...');
    const includeDeleted = req.query.includeDeleted === 'true';
    const pages = await Page.getAll({ includeDeleted });
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
    const page = await Page.getById(id, { includeDeleted: true });
    const translations = await PageTranslation.getTranslationsByPageId(id, { includeDeleted: true });
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

    const createdTranslations = [];
    for (const translation of translations) {
      const { locale, title, content } = translation || {};
      console.log('[POST /api/pages] Processing translation:', translation);

      if (!locale || typeof content === 'undefined') {
        console.warn('[POST /api/pages] Skipping invalid translation:', translation);
        continue;
      }

      try {
        const created = await PageTranslation.create({
          page_id: newPage.id,
          locale,
          title: title || '',
          content: Array.isArray(content) ? content : content || [],
        });
        createdTranslations.push(created);
        console.log(`[POST /api/pages] Translation saved for locale: ${locale}`);
      } catch (e) {
        console.error('[POST /api/pages] Failed to save translation:', e.message);
        // decide whether to fail whole request or continue; for now continue
      }
    }

    res.status(201).json({ ...newPage, translations: createdTranslations });
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
    const page = await Page.getById(id, { includeDeleted: true });
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
      const { locale, title, content } = translation || {};
      console.log(`[PUT /api/pages/${id}] Processing translation for ${locale}...`, translation);

      if (!locale || typeof content === 'undefined') {
        console.warn(`[PUT /api/pages/${id}] Skipping invalid translation:`, translation);
        continue;
      }

      try {
        const existing = await PageTranslation.getByPageIdAndLocale(id, locale);
        if (existing) {
          await PageTranslation.update(existing.id, {
            title: title || '',
            content: Array.isArray(content) ? content : content || [],
          });
          console.log(`[PUT /api/pages/${id}] Updated translation for locale: ${locale}`);
        } else {
          await PageTranslation.create({
            page_id: id,
            locale,
            title: title || '',
            content: Array.isArray(content) ? content : content || [],
          });
          console.log(`[PUT /api/pages/${id}] Created translation for locale: ${locale}`);
        }
      } catch (e) {
        console.error(`[PUT /api/pages/${id}] Translation error (${locale}):`, e.message);
      }
    }

    const updatedTranslations = await PageTranslation.getTranslationsByPageId(id, { includeDeleted: true });
    const updatedPage = await Page.getById(id, { includeDeleted: true });
    res.json({ ...updatedPage, translations: updatedTranslations });
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
    // Soft delete translations then page
    const trs = await PageTranslation.getTranslationsByPageId(id, { includeDeleted: true });
    for (const tr of trs) {
      await PageTranslation.softDelete(tr.id);
    }
    await Page.softDelete(id);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(`[DELETE /api/pages/${req.params.id}] Error:`, err.message, err.stack);
    res.status(500).json({ error: `Failed to delete page: ${err.message}` });
  }
});

module.exports = router;