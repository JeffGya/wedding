// apps/backend/routes/publicPages.js
// Public-facing page fetch with RSVP gating, locale fallback, and model-based DB access.

'use strict';

const express = require('express');
const Page = require('../db/models/pages');
const PageTranslation = require('../db/models/pageTranslation');
const { processBlocks } = require('../utils/blockSchema');
const SurveyBlock = require('../db/models/surveyBlock');

const router = express.Router();

/**
 * @openapi
 * /api/pages/{slug}:
 *   get:
 *     summary: Fetch a public page by slug
 *     tags:
 *       - Pages
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique slug identifier for the page
 *       - in: query
 *         name: locale
 *         schema:
 *           type: string
 *           default: en
 *         description: Desired locale (falls back to 'en' if not available)
 *       - in: query
 *         name: withSurveys
 *         schema:
 *           type: boolean
 *         description: If true, preload survey configurations for survey blocks
 *     responses:
 *       '200':
 *         description: Page content and metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 slug:
 *                   type: string
 *                 locale:
 *                   type: string
 *                 title:
 *                   type: string
 *                 content:
 *                   type: array
 *                   description: Array of content blocks
 *                   items:
 *                     type: object
 *       '403':
 *         description: Access denied because RSVP required or not attending
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 reason:
 *                   type: string
 *       '404':
 *         description: Page or translation not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '500':
 *         $ref: '#/components/responses/ServerError'
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

    // translation.content is parsed in the model; sanitize & drop invalid blocks for public output
    let content = Array.isArray(translation.content) ? translation.content : [];
    try {
      const { blocks, errors } = processBlocks(content, { mode: 'public', skipInvalid: true });
      if (errors.length) {
        console.warn('[PUBLIC PAGE] Dropped invalid blocks:', errors.map(e => e.index));
      }
      content = blocks;
    } catch (ve) {
      console.error('[PUBLIC PAGE] Block processing error:', ve.message);
      return res.status(500).json({ error: 'Failed to process page content' });
    }

    // 4. Optionally preload survey configs inline
    const withSurveys = req.query.withSurveys === 'true';
    if (withSurveys) {
      const surveyIds = content.filter(b => b.type === 'survey').map(b => b.id);
      if (surveyIds.length) {
        const surveyMap = {};
        for (const sid of surveyIds) {
          try {
            const sb = await SurveyBlock.getById(sid, { includeDeleted: false });
            if (sb) {
              // options already parsed in model
              surveyMap[sid] = {
                question: sb.question,
                type: sb.type,
                options: sb.options || [],
                is_required: sb.is_required,
                is_anonymous: sb.is_anonymous
              };
            } else {
              console.warn('[PUBLIC PAGE] Missing survey block id:', sid);
            }
          } catch (e) {
            console.error('[PUBLIC PAGE] Error loading survey block id', sid, e.message);
          }
        }

        // Attach or drop missing ones
        content = content.filter(block => {
          if (block.type !== 'survey') return true;
          const data = surveyMap[block.id];
          if (!data) {
            console.warn('[PUBLIC PAGE] Dropping survey block with missing id:', block.id);
            return false;
          }
          block.survey = data;
          return true;
        });
      }
    }

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