// apps/backend/routes/publicPages.js
// Public-facing page fetch with RSVP gating, locale fallback, and model-based DB access.

'use strict';

const express = require('express');
const Page = require('../db/models/pages');
const PageTranslation = require('../db/models/pageTranslation');
const { processBlocks } = require('../utils/blockSchema');
const SurveyBlock = require('../db/models/surveyBlock');
const SurveyResponse = require('../db/models/surveyResponse');
const logger = require('../helpers/logger');

const router = express.Router();

// GET /api/pages/navigation
router.get('/navigation', async (req, res) => {
  const locale = req.query.locale || 'en';
  logger.debug('[NAV] Navigation endpoint hit with locale:', locale);
  // Debug logs before try/catch
  logger.debug('[NAV][DEBUG] typeof Page:', typeof Page);
  logger.debug('[NAV][DEBUG] Page model keys:', Object.keys(Page));
  logger.debug('[NAV][DEBUG] Page.findAll:', typeof Page.findAll);
  try {
    // Debug log before calling Page.findAll
    logger.debug('[NAV][DEBUG] About to call Page.findAll');
    // Fetch only published pages that should show in nav, ordered by nav_order
    const pages = await Page.findAll({
      where: { is_published: true, show_in_nav: true },
      order: [['nav_order', 'ASC']],
    });
    logger.debug('[NAV] Pages fetched:', Array.isArray(pages) ? pages.map(p => ({id: p.id, slug: p.slug, is_published: p.is_published, show_in_nav: p.show_in_nav, nav_order: p.nav_order})) : pages);

    // Map to minimal nav payload with locale fallback
    const nav = await Promise.all(pages.map(async (p) => {
      let tr = await PageTranslation.getByPageIdAndLocale(p.id, locale);
      logger.debug(`[NAV] Translation for page ${p.slug} (${locale}):`, tr);
      if (!tr && locale !== 'en') {
        tr = await PageTranslation.getByPageIdAndLocale(p.id, 'en');
        logger.debug(`[NAV] Fallback translation for page ${p.slug} (en):`, tr);
      }
      return {
        slug: p.slug,
        title: tr ? tr.title : p.slug,
        order: p.nav_order
      };
    }));
    logger.debug('[NAV] Final nav array:', nav);

    return res.json(nav);
  } catch (err) {
    logger.error('[NAV] error fetching navigation:', err, err && err.stack);
    return res.status(500).json({ error: 'Could not load navigation' });
  }
});

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

  logger.debug(`[PUBLIC PAGE] slug="${slug}" locale="${requestedLocale}" guestId=${guest?.id || 'none'}`);

  try {
    // 1. Fetch page by slug
    const page = await Page.getBySlug(slug);
    if (!page || !page.is_published) {
      return res.status(404).json({
        error: 'Page not found or unpublished',
        message: 'Page "' + slug + '" not found or unpublished.'
      });
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
        let reason;
        if (!guest) {
          reason = 'no_session';
        } else if (guest.rsvp_status === 'pending' || guest.rsvp_status === null) {
          reason = 'pending';
        } else if (guest.rsvp_status === 'not_attending') {
          reason = 'not_attending';
        } else {
          reason = 'not_attending'; // fallback for any other status
        }
        
        return res.status(403).json({ 
          error: 'Not allowed to access this page', 
          reason,
          message: 'This page requires you to have RSVP\'d as attending'
        });
      }
    }

    // 3. Fetch translation for requested locale (or fallback)
    let translation = await PageTranslation.getByPageIdAndLocale(page.id, requestedLocale);
    if (!translation && requestedLocale !== fallbackLocale) {
      logger.warn(`[PUBLIC PAGE] No translation for "${requestedLocale}", falling back to "${fallbackLocale}"`);
      translation = await PageTranslation.getByPageIdAndLocale(page.id, fallbackLocale);
    }

    if (!translation) {
      return res.status(404).json({
        error: 'Page not found or unpublished',
        message: 'Translation for locale "' + requestedLocale + '" not found on page "' + slug + '".'
      });
    }

    if (!translation.content) {
      logger.error('[PUBLIC PAGE] Missing content in translation.');
      return res.status(500).json({
        error: 'Invalid block data',
        message: 'Translation content is missing or invalid for page "' + slug + '" locale "' + translation.locale + '".'
      });
    }

    // translation.content is parsed in the model; sanitize & drop invalid blocks for public output
    let content = Array.isArray(translation.content) ? translation.content : [];
    try {
      const { blocks, errors } = processBlocks(content, { mode: 'public', skipInvalid: true });
      if (errors.length) {
        logger.warn('[PUBLIC PAGE] Dropped invalid blocks:', errors.map(e => e.index));
      }
      content = blocks;
    } catch (ve) {
      logger.error('[PUBLIC PAGE] Block processing error:', ve.message);
      return res.status(500).json({
        error: 'Invalid block data',
        message: 'Failed to process page content: ' + ve.message
      });
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
            if (!sb) {
              logger.warn('[PUBLIC PAGE] Missing survey block id:', sid);
              continue;
            }
            // Transform options for choice types into [{id, label}]
            const rawOpts = sb.options || [];
            const options = Array.isArray(rawOpts)
              ? rawOpts.map((label, idx) => ({ id: idx + 1, label }))
              : [];

            // Determine if this guest has already responded (only for non-anonymous)
            let alreadyResponded = false;
            if (!sb.is_anonymous && guest) {
              const responses = await SurveyResponse.getAllBySurvey(sid);
              alreadyResponded = responses.some(r => r.guest_id === guest.id);
            }

            // Build enriched survey data
            surveyMap[sid] = {
              question: sb.question,
              inputType: sb.type,
              options: ['radio','checkbox'].includes(sb.type) ? options : undefined,
              placeholder: sb.type === 'text' ? (sb.placeholder || '') : undefined,
              isRequired: !!sb.is_required,
              isAnonymous: !!sb.is_anonymous,
              alreadyResponded
            };
          } catch (e) {
            logger.error('[PUBLIC PAGE] Error loading survey block id', sid, e.message);
          }
        }

        // Attach enriched data or drop missing blocks
        content = content.filter(block => {
          if (block.type !== 'survey') return true;
          const data = surveyMap[block.id];
          if (!data) {
            logger.warn('[PUBLIC PAGE] Dropping survey block with missing id:', block.id);
            return false;
          }
          Object.assign(block, data);
          return true;
        });
      }
    }

    logger.debug(`[PUBLIC PAGE] ✅ Served page "${slug}" (${translation.locale})`);

    return res.json({
      slug: page.slug,
      locale: translation.locale,
      title: translation.title,
      content,
    });
  } catch (err) {
    logger.error('[PUBLIC PAGE] Unexpected error:', err);
    return res.status(500).json({
      error: 'Invalid block data',
      message: 'Unexpected error processing request: ' + err.message
    });
  }
});

module.exports = router;