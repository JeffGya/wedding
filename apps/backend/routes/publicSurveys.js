

'use strict';

/**
 * Public Survey routes
 * - POST /api/surveys/:id/respond
 *   Validates answer based on survey type (radio/checkbox/text)
 *   Applies RSVP gating if survey.requires_rsvp (or page gating fallback)
 *   Stores anonymous or guest-linked responses
 */

const express = require('express');
const SurveyBlock = require('../db/models/surveyBlock');
const SurveyResponse = require('../db/models/surveyResponse');
const Page = require('../db/models/pages'); // only used if we fallback to page gating
// req.guest is injected globally by parseGuestSession in index.js

const router = express.Router();

// ---------------- Rate limiter (IP + surveyId) ----------------
const buckets = new Map();
/**
 * Simple limiter: max N submissions per window per ip+survey
 */
function rl(windowMs = 5 * 60 * 1000, max = 5) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.params.id}`;
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || b.reset < now) {
      b = { count: 1, reset: now + windowMs };
      buckets.set(key, b);
      return next();
    }
    if (b.count >= max) {
      return res.status(429).json({
        error: { message: 'Too many submissions. Try again later.', code: 'RATE_LIMIT' },
        message: 'Too many submissions. Try again later.'
      });
    }
    b.count++;
    next();
  };
}
const respondLimiter = rl();

// ---------------- Helpers ----------------
function badRequest(res, msg, code = 'INVALID_RESPONSE') {
  return res.status(400).json({ error: { message: msg, code }, message: msg });
}

function isStringArray(arr) {
  return Array.isArray(arr) && arr.every(v => typeof v === 'string');
}

// ---------------- POST respond ----------------
/**
 * @openapi
 * /api/surveys/{id}/respond:
 *   post:
 *     summary: Submit a response to a survey block
 *     tags:
 *       - Surveys
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Survey block ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               response:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *             description: The response value. For radio/text it's a string, for checkbox it's an array of strings.
 *     responses:
 *       '200':
 *         description: Survey response submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       '400':
 *         $ref: '#/components/responses/InvalidResponse'
 *       '401':
 *         $ref: '#/components/responses/AuthRequired'
 *       '403':
 *         $ref: '#/components/responses/RSVPRequired'
 *       '404':
 *         $ref: '#/components/responses/NotFound'
 *       '429':
 *         $ref: '#/components/responses/RateLimit'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/:id/respond', respondLimiter, async (req, res) => {
  const rawId = req.params.id;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return badRequest(res, 'Invalid survey id', 'INVALID_ID');
  }

  try {
    const survey = await SurveyBlock.getById(id, { includeDeleted: false });
    if (!survey) {
      return res.status(404).json({ error: { message: 'Survey not found' }, message: 'Survey not found' });
    }

    // RSVP gating
    const requiresRSVP = !!survey.requires_rsvp; // default false if not present
    if (requiresRSVP) {
      const guest = req.guest;
      const attending = guest && (
        (typeof guest.rsvp_status === 'string' && guest.rsvp_status.toLowerCase() === 'attending') ||
        guest.attending === 1 || guest.attending === true
      );
      if (!attending) {
        return res.status(403).json({
          error: { message: 'RSVP required to respond to this survey', code: 'RSVP_REQUIRED' },
          message: 'RSVP required to respond to this survey'
        });
      }
    } else if (survey.page_id) {
      // Fallback: if survey is attached to a page that is gated, respect it
      try {
        const page = await Page.getById(survey.page_id, { includeDeleted: false });
        if (page && page.requires_rsvp) {
          const guest = req.guest;
          const attending = guest && (
            (typeof guest.rsvp_status === 'string' && guest.rsvp_status.toLowerCase() === 'attending') ||
            guest.attending === 1 || guest.attending === true
          );
          if (!attending) {
            return res.status(403).json({
              error: { message: 'RSVP required to respond to this survey', code: 'RSVP_REQUIRED' },
              message: 'This survey is for attending guests. An attending RSVP required to respond to this survey'
            });
          }
        }
      } catch (e) {
        // ignore fallback errors
      }
    }

    // Validate response body
    // Map numeric IDs back to option labels if needed
    const rawResponse = req.body.response;
    // Radio: single ID or label
    if (survey.type === 'radio' && rawResponse != null) {
      let r = rawResponse;
      const idx = Number(r) - 1;
      if (!isNaN(idx) && survey.options[idx] !== undefined) {
        req.body.response = survey.options[idx];
      }
    }
    // Checkbox: array of IDs or labels
    if (survey.type === 'checkbox' && Array.isArray(rawResponse)) {
      req.body.response = rawResponse.map(r => {
        const idx = Number(r) - 1;
        return (!isNaN(idx) && survey.options[idx] !== undefined)
          ? survey.options[idx]
          : r;
      });
    }
    const body = req.body || {};
    const type = survey.type;
    const required = !!survey.is_required;

    let valid = true;
    let normalizedResponse = null;

    if (type === 'radio') {
      if (typeof body.response !== 'string') valid = false;
      else if (!survey.options.includes(body.response)) valid = false;
      else normalizedResponse = body.response;
    } else if (type === 'checkbox') {
      if (!isStringArray(body.response)) valid = false;
      else if (!body.response.every(opt => survey.options.includes(opt))) valid = false;
      else normalizedResponse = body.response;
    } else if (type === 'text') {
      if (typeof body.response !== 'string') valid = false;
      else normalizedResponse = body.response.trim();
    } else {
      return badRequest(res, 'Unsupported survey type', 'INVALID_TYPE');
    }

    if (required) {
      if (type === 'text' && !normalizedResponse) valid = false;
      if (type === 'radio' && !normalizedResponse) valid = false;
      if (type === 'checkbox' && (!Array.isArray(normalizedResponse) || normalizedResponse.length === 0)) valid = false;
    }

    if (!valid) {
      return badRequest(res, 'Your response does not meet survey requirements, please check and try again', 'INVALID_RESPONSE');
    }

    // Determine guest_id
    let guestId = null;
    if (!survey.is_anonymous) {
      if (!req.guest || !req.guestId) {
        return res.status(401).json({
          error: { message: 'This survey is for attending guests. An attending RSVP required to respond to this survey', code: 'AUTH_REQUIRED' },
          message: 'This survey is for attending guests. An attending RSVP required to respond to this survey'
        });
      }
      guestId = req.guestId;
    }

    // Save response
    await SurveyResponse.create({
      survey_block_id: id,
      guest_id: guestId,
      response_text: typeof normalizedResponse === 'string'
        ? normalizedResponse
        : null,
      response_json: Array.isArray(normalizedResponse)
        ? JSON.stringify(normalizedResponse)
        : null
    });

    return res.json({ success: true });
  } catch (err) {
    const logger = require('../helpers/logger');
    logger.error(`[POST /api/surveys/${rawId}/respond] Error:`, err);
    return res.status(500).json({
      error: { message: 'Failed to save response' },
      message: 'It looks like something went wrong on our end. Please try again later.'
    });
  }
});

module.exports = router;