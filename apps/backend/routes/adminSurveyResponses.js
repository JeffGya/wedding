

'use strict';

/**
 * Admin Survey Responses routes
 * List and delete survey responses per survey.
 * Mounted at /api/admin/surveys/:id/responses
 */

const express = require('express');

const SurveyResponse = require('../db/models/surveyResponse');

const getDbConnection = require('../db/connection');
const db = getDbConnection();
const sqlite3 = require('sqlite3').verbose();
const util = require('util');
const dbGet = process.env.DB_TYPE === 'mysql'
  ? async (sql, params) => {
      const [rows] = await db.query(sql, params);
      return rows[0];
    }
  : util.promisify(db.get.bind(db));

const router = express.Router({ mergeParams: true });

/**
 * @openapi
 * /api/admin/surveys/{id}/responses:
 *   get:
 *     summary: List responses for a survey block
 *     tags:
 *       - SurveyResponses
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Survey block ID
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           enum: [all, anonymous, guest]
 *         description: Filter responses by anonymous or guest
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *         description: Response format
 *     responses:
 *       '200':
 *         description: A paginated list of survey responses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SurveyResponse'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       '400':
 *         $ref: '#/components/responses/InvalidId'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */
// GET /api/admin/surveys/:id/responses
// Query:
//   filter=anonymous|guest|all (default all)
//   page (1-based), limit (max number per page)
//   format=json|csv (default json)
router.get('/', async (req, res) => {
  const rawId = req.params.id;
  const surveyId = Number(rawId);
  if (!Number.isInteger(surveyId) || surveyId <= 0) {
    return res.status(400).json({
      error: { message: 'Invalid survey id', code: 'INVALID_ID' },
      message: 'Invalid survey id'
    });
  }

  const filter = (req.query.filter || 'all').toLowerCase();
  const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 1000);

  try {
    let rows = await SurveyResponse.getAllBySurvey(surveyId);

    // Apply filter
    if (filter === 'anonymous') {
      rows = rows.filter(r => r.guest_id == null);
    } else if (filter === 'guest') {
      rows = rows.filter(r => r.guest_id != null);
    }

    const total = rows.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (pageNum - 1) * limit;
    const pageRows = rows.slice(offset, offset + limit);

    // Enrich each response with the guest's name
    const enrichedRows = await Promise.all(pageRows.map(async (r) => {
      if (r.guest_id != null) {
        try {
          const row = await dbGet('SELECT name FROM guests WHERE id = ?', [r.guest_id]);
          r.guest_name = row ? row.name : null;
        } catch (e) {
          r.guest_name = null;
        }
      } else {
        r.guest_name = null;
      }
      return r;
    }));

    // CSV export
    if (req.query.format === 'csv') {
      let csv = 'id,survey_block_id,guest_id,guest_name,response_text,created_at\n';
      enrichedRows.forEach(r => {
        const guest = r.guest_id != null ? r.guest_id : '';
        const guestName = r.guest_name != null ? `"${String(r.guest_name).replace(/"/g, '""')}"` : '';
        const resp = String(r.response_text || '').replace(/"/g, '""');
        const created = new Date(r.created_at).toISOString();
        csv += `${r.id},${r.survey_block_id},${guest},${guestName},"${resp}","${created}"\n`;
      });
      res.header('Content-Type', 'text/csv');
      return res.send(csv);
    }

    res.json({
      data: enrichedRows,
      meta: { filter, page: pageNum, limit, total, total_pages: totalPages }
    });
  } catch (err) {
    const logger = require('../helpers/logger');
    logger.error(`[GET /api/admin/surveys/${surveyId}/responses] Error:`, err.message || err);
    res.status(500).json({
      error: { message: 'Failed to fetch responses' },
      message: 'Failed to fetch responses'
    });
  }
});

/**
 * @openapi
 * /api/admin/surveys/{id}/responses:
 *   delete:
 *     summary: Delete all responses for a survey block
 *     tags:
 *       - SurveyResponses
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Survey block ID
 *     responses:
 *       '200':
 *         description: Successfully deleted responses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 deleted:
 *                   type: integer
 *                   description: Number of responses deleted
 *       '400':
 *         $ref: '#/components/responses/InvalidId'
 *       '500':
 *         $ref: '#/components/responses/ServerError'
 */
// DELETE /api/admin/surveys/:id/responses
// Deletes all responses for the given survey
router.delete('/', async (req, res) => {
  const rawId = req.params.id;
  const surveyId = Number(rawId);
  if (!Number.isInteger(surveyId) || surveyId <= 0) {
    return res.status(400).json({
      error: { message: 'Invalid survey id', code: 'INVALID_ID' },
      message: 'Invalid survey id'
    });
  }

  try {
    const deleted = await SurveyResponse.deleteBySurveyId(surveyId);
    res.json({ success: true, deleted });
  } catch (err) {
    const logger = require('../helpers/logger');
    logger.error(`[DELETE /api/admin/surveys/${surveyId}/responses] Error:`, err.message || err);
    res.status(500).json({
      error: { message: 'Failed to delete responses' },
      message: 'Failed to delete responses'
    });
  }
});

module.exports = router;