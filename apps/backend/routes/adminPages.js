const express = require('express');
const router = express.Router();

const Page = require('../db/models/pages');
const PageTranslation = require('../db/models/pageTranslation');
const { processBlocks } = require('../utils/blockSchema');
const SurveyBlock = require('../db/models/surveyBlock');

/**
 * @openapi
 * /api/admin/pages:
 *   get:
 *     summary: List all pages with pagination and filters
 *     tags:
 *       - Pages
 *     parameters:
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *         description: Include soft-deleted pages
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, published, draft]
 *         description: Filter by publish status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: orderBy
 *         schema:
 *           type: string
 *           enum: [created_at, updated_at, nav_order, slug, id]
 *       - in: query
 *         name: orderDir
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *     responses:
 *       '200':
 *         description: A paginated list of pages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Page'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */
// GET /api/pages — fetch all pages
router.get('/', async (req, res) => {
  try {
    console.log('[GET /api/pages] Fetching all pages with pagination & filters (route-level)...');

    // Flags & params
    const includeDeleted = req.query.includeDeleted === 'true';
    const status = (req.query.status || 'all').toLowerCase(); // 'all' | 'published' | 'draft'
    const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const orderBy = (req.query.orderBy || 'created_at').toLowerCase();
    const orderDir = (req.query.orderDir || 'DESC').toUpperCase();

    // Fetch all (model left untouched)
    const pages = await Page.getAll({ includeDeleted });

    // Filter by status
    const filtered = pages.filter(p => {
      if (status === 'published') return !!p.is_published;
      if (status === 'draft') return !p.is_published;
      return true;
    });

    // Safe orderBy whitelist
    const allowedOrder = ['created_at', 'updated_at', 'nav_order', 'slug', 'id'];
    const key = allowedOrder.includes(orderBy) ? orderBy : 'created_at';
    const dir = orderDir === 'ASC' ? 1 : -1;

    filtered.sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      // handle undefined/null
      if (va == null && vb == null) return 0;
      if (va == null) return 1 * dir;
      if (vb == null) return -1 * dir;

      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    // Pagination
    const total = filtered.length;
    const offset = (pageNum - 1) * limit;
    const paged = filtered.slice(offset, offset + limit);

    const meta = {
      page: pageNum,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      status,
      includeDeleted,
      orderBy: key,
      orderDir,
    };

    console.log('[GET /api/pages] Returning', paged.length, 'of', total);
    res.json({ data: paged, meta });
  } catch (err) {
    console.error('[GET /api/pages] Error:', err.message, err.stack);
    res.status(500).json({ error: `Failed to fetch pages: ${err.message}` });
  }
});

/**
 * @openapi
 * /api/admin/pages/{id}:
 *   get:
 *     summary: Get a page by ID
 *     tags:
 *       - Pages
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Page ID
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: boolean
 *         description: Include soft-deleted translations
 *     responses:
 *       '200':
 *         description: Page detail with translations
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Page'
 *                 - type: object
 *                   properties:
 *                     translations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PageTranslation'
 *       '400':
 *         $ref: '#/components/responses/InvalidId'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */
// GET /api/pages/:id — fetch a single page with its translations
router.get('/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: { message: 'Invalid page id', code: 'INVALID_ID' },
        message: 'Invalid page id'
      });
    }
    console.log(`[GET /api/pages/${id}] Fetching page and translations...`);
    const page = await Page.getById(id, { includeDeleted: true });
    const translations = await PageTranslation.getTranslationsByPageId(id, { includeDeleted: true });
    res.json({ ...page, translations });
  } catch (err) {
    console.error(`[GET /api/pages/${req.params.id}] Error:`, err.message, err.stack);
    res.status(500).json({ error: `Failed to fetch page: ${err.message}` });
  }
});

/**
 * @openapi
 * /api/admin/pages:
 *   post:
 *     summary: Create a new page with translations
 *     tags:
 *       - Pages
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slug
 *               - is_published
 *               - requires_rsvp
 *               - show_in_nav
 *               - nav_order
 *               - translations
 *             properties:
 *               slug:
 *                 type: string
 *               is_published:
 *                 type: boolean
 *               requires_rsvp:
 *                 type: boolean
 *               show_in_nav:
 *                 type: boolean
 *               nav_order:
 *                 type: integer
 *               translations:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/PageTranslationInput'
 *     responses:
 *       '201':
 *         description: Created page with translations
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Page'
 *                 - type: object
 *                   properties:
 *                     translations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PageTranslation'
 *       '400':
 *         $ref: '#/components/responses/InvalidRequest'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */
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

    // --------------------------------------------------
    // 1) Pre-validate ALL translations & survey refs first (no DB writes yet)
    // --------------------------------------------------
    const preparedTranslations = [];
    for (const translation of translations) {
      const { locale, title, content } = translation || {};
      console.log('[POST /api/pages] Pre-validating translation:', translation);

      if (!locale || typeof content === 'undefined') {
        const msg = `Invalid translation payload (locale/content missing)`;
        console.warn('[POST /api/pages]', msg, translation);
        return res.status(400).json({
          error: { message: msg, code: 'INVALID_TRANSLATION' },
          message: msg
        });
      }

      // Validate & sanitize blocks
      let processedBlocks;
      try {
        const { blocks } = processBlocks(Array.isArray(content) ? content : (content || []), {
          mode: 'admin',
          skipInvalid: false,
        });
        processedBlocks = blocks;
      } catch (ve) {
        console.error('[POST /api/pages] Block validation error:', ve.message);
        return res.status(400).json({
          error: { message: ve.message, code: 'INVALID_BLOCK' },
          message: ve.message
        });
      }

      // Verify survey block IDs exist
      const surveyIds = processedBlocks.filter(b => b.type === 'survey').map(b => b.id);
      if (surveyIds.length) {
        for (const sid of surveyIds) {
          const sb = await SurveyBlock.getById(sid, { includeDeleted: false }).catch(() => null);
          if (!sb) {
            const msg = `Survey block id ${sid} does not exist.`;
            console.error('[POST /api/pages] ' + msg);
            return res.status(400).json({
              error: { message: msg, code: 'SURVEY_NOT_FOUND' },
              message: msg
            });
          }
        }
      }

      preparedTranslations.push({
        locale,
        title: title || '',
        content: processedBlocks,
      });
    }

    // --------------------------------------------------
    // 2) Create page, then translations (now that everything is valid)
    // --------------------------------------------------
    let newPage;
    try {
      newPage = await Page.create({
        slug,
        is_published,
        requires_rsvp,
        show_in_nav,
        nav_order,
      });
    } catch (createErr) {
      console.error('[POST /api/pages] Error creating page:', createErr.message);
      if (createErr.message.includes('UNIQUE constraint failed') || createErr.message.includes('duplicate key')) {
        return res.status(400).json({
          error: { message: 'Slug already exists. Please use a unique slug.', code: 'DUPLICATE_SLUG' },
          message: 'Slug already exists. Please use a unique slug.'
        });
      }
      return res.status(500).json({ error: { message: `Failed to create page: ${createErr.message}` }, message: `Failed to create page: ${createErr.message}` });
    }

    console.log('[POST /api/pages] Created page:', newPage);

    // Auto-link any survey blocks with null page_id to this new page
    const surveyIdsToLinkPost = preparedTranslations
      .flatMap(t => t.content.filter(b => b.type === 'survey').map(b => b.id))
      .filter((v, i, a) => a.indexOf(v) === i);

    for (const sid of surveyIdsToLinkPost) {
      try {
        const sb2 = await SurveyBlock.getById(sid, { includeDeleted: true });
        if (sb2 && sb2.page_id == null) {
          await SurveyBlock.update(sid, { page_id: newPage.id });
          console.log(`[POST /api/pages] Linked survey block ${sid} to page ${newPage.id}`);
        }
      } catch (linkErr) {
        console.warn(`[POST /api/pages] Could not link survey block ${sid}:`, linkErr.message);
      }
    }

    const createdTranslations = [];
    try {
      for (const t of preparedTranslations) {
        const created = await PageTranslation.create({
          page_id: newPage.id,
          locale: t.locale,
          title: t.title,
          content: t.content,
        });
        createdTranslations.push(created);
        console.log(`[POST /api/pages] Translation saved for locale: ${t.locale}`);
      }
    } catch (trErr) {
      console.error('[POST /api/pages] Failed while saving translations, cleaning up...', trErr.message);
      // Attempt cleanup to avoid orphan page
      try {
        await Page.destroy(newPage.id);
      } catch (cleanupErr) {
        console.error('[POST /api/pages] Cleanup failed:', cleanupErr.message);
      }
      return res.status(500).json({
        error: { message: 'Failed to save translations', code: 'TRANSLATION_SAVE_FAILED' },
        message: 'Failed to save translations'
      });
    }

    return res.status(201).json({ ...newPage, translations: createdTranslations });
  } catch (err) {
    console.error('[POST /api/pages] Error creating page:', err.message, err.stack);
    if (err.message.includes('UNIQUE constraint failed') || err.message.includes('duplicate key')) {
      return res.status(400).json({ error: 'Slug already exists. Please use a unique slug.' });
    }
    res.status(500).json({ error: `Failed to create page: ${err.message}` });
  }
});

/**
 * @openapi
 * /api/admin/pages/{id}:
 *   put:
 *     summary: Update an existing page and its translations
 *     tags:
 *       - Pages
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Page ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               slug:
 *                 type: string
 *               is_published:
 *                 type: boolean
 *               requires_rsvp:
 *                 type: boolean
 *               show_in_nav:
 *                 type: boolean
 *               nav_order:
 *                 type: integer
 *               translations:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/PageTranslationInput'
 *     responses:
 *       '200':
 *         description: Updated page with translations
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Page'
 *                 - type: object
 *                   properties:
 *                     translations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PageTranslation'
 *       '400':
 *         $ref: '#/components/responses/InvalidRequest'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */
// PUT /api/pages/:id — update main page fields and translations
router.put('/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: { message: 'Invalid page id', code: 'INVALID_ID' },
        message: 'Invalid page id'
      });
    }
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

    // --------------------------------------------------
    // 1) Pre-validate ALL incoming translations (no DB writes yet)
    // --------------------------------------------------
    const preparedTranslations = [];
    for (const translation of translations) {
      const { locale, title, content } = translation || {};
      console.log(`[PUT /api/pages/${id}] Pre-validating translation for ${locale}...`, translation);

      if (!locale || typeof content === 'undefined') {
        const msg = `Invalid translation payload (locale/content missing)`;
        console.warn(`[PUT /api/pages/${id}]`, msg, translation);
        return res.status(400).json({
          error: { message: msg, code: 'INVALID_TRANSLATION' },
          message: msg
        });
      }

      // Process & validate blocks
      let processedBlocks;
      try {
        const { blocks } = processBlocks(Array.isArray(content) ? content : (content || []), {
          mode: 'admin',
          skipInvalid: false,
        });
        processedBlocks = blocks;
      } catch (ve) {
        console.error(`[PUT /api/pages/${id}] Block validation error (${locale}):`, ve.message);
        return res.status(400).json({
          error: { message: ve.message, code: 'INVALID_BLOCK' },
          message: ve.message
        });
      }

      // Verify survey IDs
      const surveyIds = processedBlocks.filter(b => b.type === 'survey').map(b => b.id);
      if (surveyIds.length) {
        for (const sid of surveyIds) {
          const sb = await SurveyBlock.getById(sid, { includeDeleted: false }).catch(() => null);
          if (!sb) {
            const msg = `Survey block id ${sid} does not exist.`;
            console.error(`[PUT /api/pages/${id}] ` + msg);
            return res.status(400).json({
              error: { message: msg, code: 'SURVEY_NOT_FOUND' },
              message: msg
            });
          }
        }
      }

      preparedTranslations.push({
        locale,
        title: title || '',
        content: processedBlocks,
      });
    }

    // --------------------------------------------------
    // 2) Update page core fields (safe now)
    // --------------------------------------------------
    await Page.update(id, {
      slug,
      is_published,
      requires_rsvp,
      show_in_nav,
      nav_order,
    });
    console.log(`[PUT /api/pages/${id}] Page updated.`);

    // Auto-link any survey blocks with null page_id to this page
    const surveyIdsToLinkPut = preparedTranslations
      .flatMap(t => t.content.filter(b => b.type === 'survey').map(b => b.id))
      .filter((v, i, a) => a.indexOf(v) === i);

    for (const sid of surveyIdsToLinkPut) {
      try {
        const sb2 = await SurveyBlock.getById(sid, { includeDeleted: true });
        if (sb2 && sb2.page_id == null) {
          await SurveyBlock.update(sid, { page_id: id });
          console.log(`[PUT /api/pages/${id}] Linked survey block ${sid} to page ${id}`);
        }
      } catch (linkErr) {
        console.warn(`[PUT /api/pages/${id}] Could not link survey block ${sid}:`, linkErr.message);
      }
    }

    // --------------------------------------------------
    // 3) Upsert translations with prepared content
    // --------------------------------------------------
    for (const t of preparedTranslations) {
      const existing = await PageTranslation.getByPageIdAndLocale(id, t.locale);
      if (existing) {
        await PageTranslation.update(existing.id, {
          title: t.title,
          content: t.content,
        });
        console.log(`[PUT /api/pages/${id}] Updated translation for locale: ${t.locale}`);
      } else {
        await PageTranslation.create({
          page_id: id,
          locale: t.locale,
          title: t.title,
          content: t.content,
        });
        console.log(`[PUT /api/pages/${id}] Created translation for locale: ${t.locale}`);
      }
    }

    const updatedTranslations = await PageTranslation.getTranslationsByPageId(id, { includeDeleted: true });
    const updatedPage = await Page.getById(id, { includeDeleted: true });
    return res.json({ ...updatedPage, translations: updatedTranslations });
  } catch (err) {
    console.error(`[PUT /api/pages/${req.params.id}] Error:`, err.message, err.stack);
    res.status(500).json({ error: `Failed to update page: ${err.message}` });
  }
});

/**
 * @openapi
 * /api/admin/pages/{id}:
 *   delete:
 *     summary: Soft-delete a page and its translations
 *     tags:
 *       - Pages
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Page ID
 *     responses:
 *       '200':
 *         description: Deletion success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '400':
 *         $ref: '#/components/responses/InvalidId'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */
// DELETE /api/pages/:id — delete page and its translations
router.delete('/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: { message: 'Invalid page id', code: 'INVALID_ID' },
        message: 'Invalid page id'
      });
    }
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


/**
 * @openapi
 * /api/admin/pages/{id}/restore:
 *   put:
 *     summary: Restore a soft-deleted page and its translations
 *     tags:
 *       - Pages
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Page ID
 *     responses:
 *       '200':
 *         description: Restored page and translations
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Page'
 *                 - type: object
 *                   properties:
 *                     translations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PageTranslation'
 *       '400':
 *         $ref: '#/components/responses/InvalidId'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */
// PUT /api/pages/:id/restore — restore a soft-deleted page and its translations
router.put('/:id/restore', async (req, res) => {
  const rawId = req.params.id;
  const id = Number(rawId);
  try {
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: { message: 'Invalid page id', code: 'INVALID_ID' },
        message: 'Invalid page id'
      });
    }
    console.log(`[RESTORE /api/pages/${id}] Restoring page and translations...`);

    const page = await Page.getById(id, { includeDeleted: true });
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    // Restore page
    await Page.restore(id);

    // Restore translations belonging to this page
    const deletedTranslations = await PageTranslation.getTranslationsByPageId(id, { includeDeleted: true });
    for (const tr of deletedTranslations) {
      if (tr.deleted_at) {
        await PageTranslation.restore(tr.id);
      }
    }

    const restoredPage = await Page.getById(id, { includeDeleted: true });
    const restoredTranslations = await PageTranslation.getTranslationsByPageId(id, { includeDeleted: true });

    res.json({ ...restoredPage, translations: restoredTranslations });
  } catch (err) {
    console.error(`[RESTORE /api/pages/${id}] Error:`, err.message, err.stack);
    res.status(500).json({ error: `Failed to restore page: ${err.message}` });
  }
});

/**
 * @openapi
 * /api/admin/pages/{id}/destroy:
 *   delete:
 *     summary: Permanently delete a page and its translations
 *     tags:
 *       - Pages
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Page ID
 *     responses:
 *       '200':
 *         description: Deletion success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '400':
 *         $ref: '#/components/responses/InvalidId'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */
// DELETE /api/pages/:id/destroy — Permanently delete page and translations
router.delete('/:id/destroy', async (req, res) => {
  const rawId = req.params.id;
  const id = Number(rawId);
  try {
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: { message: 'Invalid page id', code: 'INVALID_ID' },
        message: 'Invalid page id'
      });
    }
    console.log(`[DESTROY /api/pages/${id}] Hard deleting page and translations...`);

    const page = await Page.getById(id, { includeDeleted: true });
    if (!page) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const translations = await PageTranslation.getTranslationsByPageId(id, { includeDeleted: true });
    for (const tr of translations) {
      await PageTranslation.destroy(tr.id);
    }

    await Page.destroy(id);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(`[DESTROY /api/pages/${id}] Error:`, err.message, err.stack);
    res.status(500).json({ error: `Failed to permanently delete page: ${err.message}` });
  }
});

module.exports = router;