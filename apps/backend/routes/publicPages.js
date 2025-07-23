// apps/backend/routes/publicPages.js
// Public-facing page fetch with RSVP gating, locale fallback, and model-based DB access.

'use strict';

const express = require('express');
const Page = require('../db/models/pages');
const PageTranslation = require('../db/models/pageTranslation');

const router = express.Router();

/**
 * GET /api/pages/:slug?locale=en
 * - Only returns published, non-deleted pages
 * - Enforces RSVP if page.requires_rsvp === true
 * - Attempts to fetch requested locale, then falls back to 'en'
 */
router.get('/:slug', async (req, res) => {
  const { slug } = req.params;
  const requestedLocale = req.query.locale || 'en';
  const fallbackLocale = 'en';
  const guest = req.guest || null;

  console.log(`[PUBLIC PAGE] slug="${slug}" locale="${requestedLocale}" guestId=${guest?.id || 'none'}`);

  try {
    // 1. Fetch page by slug
    const page = await Page.getBySlug(slug);
    if (!page || !page.is_published) {
      return res.status(404).json({ error: 'Page not found or unpublished' });
    }

    // 2. RSVP gating (allow ONLY guests who are attending)
    if (page.requires_rsvp) {
      const isAttending =
        guest &&
        (
          (typeof guest.rsvp_status === 'string' && guest.rsvp_status.toLowerCase() === 'attending') ||
          guest.attending === 1 ||
          guest.attending === true
        );

      if (!isAttending) {
        const reason = !guest
          ? 'no_session'
          : (guest.rsvp_status || (guest.attending ? 'unknown' : 'not_attending'));
        return res.status(403).json({ error: 'Not allowed to access this page', reason });
      }
    }

    // 3. Fetch translation for requested locale (or fallback)
    let translation = await PageTranslation.getByPageIdAndLocale(page.id, requestedLocale);
    if (!translation && requestedLocale !== fallbackLocale) {
      console.warn(`[PUBLIC PAGE] No translation for "${requestedLocale}", falling back to "${fallbackLocale}"`);
      translation = await PageTranslation.getByPageIdAndLocale(page.id, fallbackLocale);
    }

    if (!translation) {
      return res.status(404).json({ error: 'Translation not found' });
    }

    if (!translation.content) {
      console.error('[PUBLIC PAGE] Missing content in translation.');
      return res.status(500).json({ error: 'Missing content in translation' });
    }

    // translation.content is already parsed in the model; ensure object/array
    const content = translation.content;

    console.log(`[PUBLIC PAGE] ✅ Served page "${slug}" (${translation.locale})`);

    return res.json({
      slug: page.slug,
      locale: translation.locale,
      title: translation.title,
      content,
    });
  } catch (err) {
    console.error('[PUBLIC PAGE] Unexpected error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;