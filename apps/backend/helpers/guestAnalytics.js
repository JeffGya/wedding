/**
 * Guest Analytics Service
 * Centralized analytics calculations for guest data
 */

const logger = require('./logger');
const { createDbHelpers } = require('../db/queryHelpers');

/**
 * Get RSVP status counts
 * @param {Object} db - Database connection
 * @returns {Promise<Object>} { total, attending, not_attending, pending }
 */
async function getRsvpStatusCounts(db) {
  try {
    const { dbAll } = createDbHelpers(db);
    
    const statusRows = await dbAll(
      `SELECT rsvp_status AS status, COUNT(*) AS count
       FROM guests
       GROUP BY rsvp_status;`,
      []
    );
    
    const stats = { total: 0, attending: 0, not_attending: 0, pending: 0 };
    statusRows.forEach((row) => {
      stats[row.status] = row.count;
      stats.total += row.count;
    });
    
    return stats;
  } catch (err) {
    logger.error('[GUEST_ANALYTICS] Error calculating RSVP status counts:', err);
    return { total: 0, attending: 0, not_attending: 0, pending: 0 };
  }
}

/**
 * Get dietary requirement breakdown
 * @param {Object} db - Database connection
 * @returns {Promise<Object>} { [dietaryType]: count }
 */
async function getDietaryBreakdown(db) {
  try {
    const { dbAll } = createDbHelpers(db);
    
    const dietRows = await dbAll(
      `SELECT dietary, COUNT(*) AS count
       FROM guests
       WHERE dietary IS NOT NULL AND dietary != ''
       GROUP BY dietary;`,
      []
    );
    
    const dietary = {};
    dietRows.forEach((row) => {
      dietary[row.dietary] = row.count;
    });
    
    return dietary;
  } catch (err) {
    logger.error('[GUEST_ANALYTICS] Error calculating dietary breakdown:', err);
    return {};
  }
}

/**
 * Get count of no-shows (pending past deadline)
 * @param {Object} db - Database connection
 * @returns {Promise<number>} Count of no-shows
 */
async function getNoShowsCount(db) {
  try {
    const { dbGet } = createDbHelpers(db);
    
    const sql = process.env.DB_TYPE === 'mysql'
      ? `SELECT COUNT(*) AS no_shows
         FROM guests
         WHERE rsvp_status = 'pending'
           AND rsvp_deadline IS NOT NULL
           AND rsvp_deadline < UTC_TIMESTAMP();`
      : `SELECT COUNT(*) AS no_shows
         FROM guests
         WHERE rsvp_status = 'pending'
           AND rsvp_deadline IS NOT NULL
           AND rsvp_deadline < datetime('now');`;
    
    const noRow = await dbGet(sql, []);
    return noRow?.no_shows || 0;
  } catch (err) {
    logger.error('[GUEST_ANALYTICS] Error calculating no-shows count:', err);
    return 0;
  }
}

/**
 * Get count of late responses (responded after deadline)
 * @param {Object} db - Database connection
 * @returns {Promise<number>} Count of late responses
 */
async function getLateResponsesCount(db) {
  try {
    const { dbGet } = createDbHelpers(db);
    
    const sql = `SELECT COUNT(*) AS late_responses
                 FROM guests
                 WHERE rsvp_status IN ('attending','not_attending')
                   AND rsvp_deadline IS NOT NULL
                   AND updated_at > rsvp_deadline;`;
    
    const lateRow = await dbGet(sql, []);
    return lateRow?.late_responses || 0;
  } catch (err) {
    logger.error('[GUEST_ANALYTICS] Error calculating late responses count:', err);
    return 0;
  }
}

/**
 * Get average response time in days
 * @param {Object} db - Database connection
 * @returns {Promise<number>} Average days between creation and RSVP update
 */
async function getAverageResponseTime(db) {
  try {
    const { dbGet } = createDbHelpers(db);
    
    const sql = process.env.DB_TYPE === 'mysql'
      ? `SELECT AVG(TIMESTAMPDIFF(DAY, created_at, updated_at)) AS avg_response_days
         FROM guests
         WHERE created_at IS NOT NULL
           AND updated_at IS NOT NULL;`
      : `SELECT AVG(JULIANDAY(updated_at) - JULIANDAY(created_at)) AS avg_response_days
         FROM guests
         WHERE created_at IS NOT NULL
           AND updated_at IS NOT NULL;`;
    
    const avgRow = await dbGet(sql, []);
    return parseFloat(avgRow?.avg_response_days) || 0.0;
  } catch (err) {
    logger.error('[GUEST_ANALYTICS] Error calculating average response time:', err);
    return 0.0;
  }
}

/**
 * Get count of emails sent (from message_recipients table)
 * @param {Object} db - Database connection
 * @returns {Promise<number>} Count of successfully sent emails
 */
async function getEmailsSentCount(db) {
  try {
    const { dbGet } = createDbHelpers(db);
    
    const sql = `SELECT COUNT(*) AS emails_sent
                 FROM message_recipients
                 WHERE delivery_status = 'sent';`;
    
    const row = await dbGet(sql, []);
    return row?.emails_sent || 0;
  } catch (err) {
    logger.error('[GUEST_ANALYTICS] Error calculating emails sent count:', err);
    return 0;
  }
}

/**
 * Get all guest analytics
 * @param {Object} db - Database connection
 * @returns {Promise<Object>} Complete analytics object
 */
async function getGuestAnalytics(db) {
  try {
    const [stats, dietary, no_shows, late_responses, avg_response_time_days, emailsSent] = await Promise.all([
      getRsvpStatusCounts(db),
      getDietaryBreakdown(db),
      getNoShowsCount(db),
      getLateResponsesCount(db),
      getAverageResponseTime(db),
      getEmailsSentCount(db)
    ]);
    
    return {
      stats,
      dietary,
      no_shows,
      late_responses,
      avg_response_time_days,
      emailsSent
    };
  } catch (err) {
    logger.error('[GUEST_ANALYTICS] Error fetching guest analytics:', err);
    // Return default values on error
    return {
      stats: { total: 0, attending: 0, not_attending: 0, pending: 0 },
      dietary: {},
      no_shows: 0,
      late_responses: 0,
      avg_response_time_days: 0.0,
      emailsSent: 0
    };
  }
}

module.exports = {
  getGuestAnalytics,
  getRsvpStatusCounts,
  getDietaryBreakdown,
  getNoShowsCount,
  getLateResponsesCount,
  getAverageResponseTime,
  getEmailsSentCount
};

