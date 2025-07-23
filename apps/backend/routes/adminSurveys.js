'use strict';

/**
 * Admin Survey routes
 * CRUD + restore/destroy + list with pagination
 * Uses SurveyBlock & SurveyResponse models.
 */

const express = require('express');
const SurveyBlock = require('../db/models/surveyBlock');
const SurveyResponse = require('../db/models/surveyResponse');

const router = express.Router();

// ---------- Helpers ----------
function isBool(v) {
  return v === true || v === false || v === 1 || v === 0;
}

function toBool(v) {
  return v === true || v === 1 || v === '1' || v === 'true';
}

function validateSurveyPayload(body, forUpdate = false) {
  const errors = [];

  const {
    question,
    type,
    options,
    is_required,
    is_anonymous,
    locale,
    page_id,
  } = body;

  if (!forUpdate || question !== undefined) {
    if (typeof question !== 'string' || !question.trim()) {
      errors.push('question must be a non-empty string');
    }
  }

  if (!forUpdate || type !== undefined) {
    const allowedTypes = ['radio', 'checkbox', 'text'];
    if (typeof type !== 'string' || !allowedTypes.includes(type)) {
      errors.push(`type must be one of ${allowedTypes.join(', ')}`);
    }
  }

  if (!forUpdate || options !== undefined) {
    if ((type === 'radio' || type === 'checkbox')) {
      if (!Array.isArray(options) || options.length === 0) {
        errors.push('options must be a non-empty array for radio/checkbox');
      } else if (!options.every(o => typeof o === 'string')) {
        errors.push('each option must be a string');
      }
    }
    if (type === 'text' && options !== undefined && options.length) {
      errors.push('options must be empty for text surveys');
    }
  }

  if (!forUpdate || is_required !== undefined) {
    if (!isBool(is_required)) {
      errors.push('is_required must be boolean');
    }
  }

  if (!forUpdate || is_anonymous !== undefined) {
    if (!isBool(is_anonymous)) {
      errors.push('is_anonymous must be boolean');
    }
  }

  if (!forUpdate || body.requires_rsvp !== undefined) {
    if (!isBool(body.requires_rsvp)) {
      errors.push('requires_rsvp must be boolean');
    }
  }

  if (!forUpdate || locale !== undefined) {
    if (typeof locale !== 'string' || !locale.trim()) {
      errors.push('locale must be a non-empty string');
    }
  }

  if (!forUpdate || page_id !== undefined) {
    if (page_id !== null && page_id !== undefined && !Number.isInteger(page_id)) {
      errors.push('page_id must be an integer or null');
    }
  }

  return errors;
}

// ---------- List ----------
router.get('/', async (req, res) => {
  try {
    const includeDeleted = req.query.includeDeleted === 'true';
    const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (pageNum - 1) * limit;

    // Use model's getAll (aligned with pages.js). No fallback.
    const all = await SurveyBlock.getAll({ includeDeleted });

    const rows = Array.isArray(all) ? all : [];
    const total = rows.length;
    const paged = rows.slice(offset, offset + limit);

    const meta = {
      page: pageNum,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      includeDeleted,
    };

    res.json({ data: paged, meta });
  } catch (err) {
    console.error('[GET /api/admin/surveys] Error:', err && err.message, err && err.stack || err);
    res.status(500).json({
      error: { message: 'Failed to fetch surveys' },
      message: 'Failed to fetch surveys'
    });
  }
});

// ---------- Create ----------
router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    console.log('[POST /api/admin/surveys] body:', payload);

    const errors = validateSurveyPayload(payload, false);
    if (errors.length) {
      return res.status(400).json({
        error: { message: errors.join(', '), code: 'INVALID_SURVEY' },
        message: errors.join(', ')
      });
    }

    const {
      question,
      type,
      options = [],
      is_required,
      is_anonymous,
      requires_rsvp = false,
      locale,
      page_id = null,
    } = payload;

    const created = await SurveyBlock.create({
      question: question.trim(),
      type,
      options,
      is_required: toBool(is_required),
      is_anonymous: toBool(is_anonymous),
      requires_rsvp: toBool(requires_rsvp),
      locale: locale.trim(),
      page_id,
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('[POST /api/admin/surveys] Error:', err);
    res.status(500).json({
      error: { message: 'Failed to create survey' },
      message: 'Failed to create survey'
    });
  }
});

// ---------- Get by ID ----------
router.get('/:id', async (req, res) => {
  const rawId = req.params.id;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: { message: 'Invalid survey id', code: 'INVALID_ID' },
      message: 'Invalid survey id'
    });
  }

  try {
    const survey = await SurveyBlock.getById(id, { includeDeleted: true });
    if (!survey) {
      return res.status(404).json({ error: { message: 'Survey not found' }, message: 'Survey not found' });
    }
    res.json(survey);
  } catch (err) {
    console.error(`[GET /api/admin/surveys/${id}] Error:`, err);
    res.status(500).json({
      error: { message: 'Failed to fetch survey' },
      message: 'Failed to fetch survey'
    });
  }
});

// ---------- Update ----------
router.put('/:id', async (req, res) => {
  const rawId = req.params.id;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: { message: 'Invalid survey id', code: 'INVALID_ID' },
      message: 'Invalid survey id'
    });
  }

  try {
    const existing = await SurveyBlock.getById(id, { includeDeleted: true });
    if (!existing) {
      return res.status(404).json({ error: { message: 'Survey not found' }, message: 'Survey not found' });
    }

    const payload = req.body;
    const errors = validateSurveyPayload(payload, true);
    if (errors.length) {
      return res.status(400).json({
        error: { message: errors.join(', '), code: 'INVALID_SURVEY' },
        message: errors.join(', ')
      });
    }

    const updateData = {};
    if (payload.question !== undefined) updateData.question = payload.question.trim();
    if (payload.type !== undefined) updateData.type = payload.type;
    if (payload.options !== undefined) updateData.options = payload.options;
    if (payload.is_required !== undefined) updateData.is_required = toBool(payload.is_required);
    if (payload.is_anonymous !== undefined) updateData.is_anonymous = toBool(payload.is_anonymous);
    if (payload.requires_rsvp !== undefined) updateData.requires_rsvp = toBool(payload.requires_rsvp);
    if (payload.locale !== undefined) updateData.locale = payload.locale.trim();
    if (payload.page_id !== undefined) updateData.page_id = payload.page_id;

    await SurveyBlock.update(id, updateData);

    const updated = await SurveyBlock.getById(id, { includeDeleted: true });
    res.json(updated);
  } catch (err) {
    console.error(`[PUT /api/admin/surveys/${id}] Error:`, err);
    res.status(500).json({
      error: { message: 'Failed to update survey' },
      message: 'Failed to update survey'
    });
  }
});

// ---------- Soft delete ----------
router.delete('/:id', async (req, res) => {
  const rawId = req.params.id;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: { message: 'Invalid survey id', code: 'INVALID_ID' },
      message: 'Invalid survey id'
    });
  }

  try {
    await SurveyBlock.softDelete(id);
    res.json({ success: true });
  } catch (err) {
    console.error(`[DELETE /api/admin/surveys/${id}] Error:`, err);
    res.status(500).json({
      error: { message: 'Failed to delete survey' },
      message: 'Failed to delete survey'
    });
  }
});

// ---------- Restore ----------
router.put('/:id/restore', async (req, res) => {
  const rawId = req.params.id;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: { message: 'Invalid survey id', code: 'INVALID_ID' },
      message: 'Invalid survey id'
    });
  }

  try {
    await SurveyBlock.restore(id);
    const restored = await SurveyBlock.getById(id, { includeDeleted: true });
    res.json(restored);
  } catch (err) {
    console.error(`[PUT /api/admin/surveys/${id}/restore] Error:`, err);
    res.status(500).json({
      error: { message: 'Failed to restore survey' },
      message: 'Failed to restore survey'
    });
  }
});

// ---------- Hard destroy ----------
router.delete('/:id/destroy', async (req, res) => {
  const rawId = req.params.id;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: { message: 'Invalid survey id', code: 'INVALID_ID' },
      message: 'Invalid survey id'
    });
  }

  try {
    // delete responses first to maintain FK integrity (if any)
    if (SurveyResponse && SurveyResponse.deleteBySurveyId) {
      await SurveyResponse.deleteBySurveyId(id);
    }
    await SurveyBlock.destroy(id);
    res.json({ success: true });
  } catch (err) {
    console.error(`[DELETE /api/admin/surveys/${id}/destroy] Error:`, err);
    res.status(500).json({
      error: { message: 'Failed to destroy survey' },
      message: 'Failed to destroy survey'
    });
  }
});

module.exports = router;