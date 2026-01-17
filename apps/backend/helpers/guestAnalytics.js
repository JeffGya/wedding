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

/**
 * Normalize error message for grouping (remove guest-specific details, timestamps, etc.)
 * @param {string} error - Error message
 * @returns {string} Normalized error message
 */
function normalizeError(error) {
  if (!error) return '';
  
  // Remove timestamps, IDs, and guest-specific details
  let normalized = error
    .replace(/\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}[.\d]*Z?/g, '[timestamp]')
    .replace(/guest[_\s]?id[:\s]?\d+/gi, '[guest_id]')
    .replace(/message[_\s]?id[:\s]?\d+/gi, '[message_id]')
    .replace(/code[:\s]?[A-Z0-9]+/gi, '[code]')
    .replace(/email[:\s]?[^\s]+@[^\s]+/gi, '[email]')
    .trim();
  
  return normalized;
}

/**
 * Get message statistics grouped by type with pagination
 * @param {Object} db - Database connection
 * @param {Object} options - Pagination options
 * @param {number} [options.page_custom=1] - Page for custom messages
 * @param {number} [options.page_rsvpAttending=1] - Page for RSVP attending
 * @param {number} [options.page_rsvpNotAttending=1] - Page for RSVP not attending
 * @param {number} [options.limit=10] - Items per page
 * @returns {Promise<Object>} Grouped message statistics with pagination
 */
async function getMessageStatsByType(db, options = {}) {
  try {
    const { dbAll, dbGet } = createDbHelpers(db);
    const pageCustom = parseInt(options.page_custom) || 1;
    const pageRsvpAttending = parseInt(options.page_rsvpAttending) || 1;
    const pageRsvpNotAttending = parseInt(options.page_rsvpNotAttending) || 1;
    const limit = parseInt(options.limit) || 10;
    
    // Fetch all sent messages with their recipients
    // Include messages that either:
    // 1. Have status='sent', OR
    // 2. Have at least one recipient with delivery_status='sent' or 'failed' (indicating an attempt was made)
    // This ensures we show messages that were actually sent, even if status wasn't updated correctly
    const messages = await dbAll(`
      SELECT DISTINCT
        m.id AS message_id,
        m.subject,
        m.body_en,
        m.body_lt,
        m.created_at,
        mr.id AS recipient_id,
        mr.guest_id,
        mr.delivery_status,
        mr.error_message,
        mr.sent_at,
        mr.language,
        g.name AS guest_name,
        g.email AS guest_email
      FROM messages m
      LEFT JOIN message_recipients mr ON m.id = mr.message_id
      LEFT JOIN guests g ON mr.guest_id = g.id
      WHERE m.status = 'sent' 
         OR EXISTS (
           SELECT 1 FROM message_recipients mr2 
           WHERE mr2.message_id = m.id 
           AND mr2.delivery_status IN ('sent', 'failed')
         )
      ORDER BY m.created_at DESC, m.id DESC
    `, []);
    
    // Group messages by ID and categorize by type
    const messageMap = new Map();
    const messageTypes = {
      custom: [],
      rsvpAttending: [],
      rsvpNotAttending: []
    };
    
    for (const row of messages) {
      if (!messageMap.has(row.message_id)) {
        // Parse subject JSON
        let subjectEn = '';
        let subjectLt = '';
        try {
          const subjectData = typeof row.subject === 'string' ? JSON.parse(row.subject) : row.subject;
          subjectEn = subjectData.en || subjectData || '';
          subjectLt = subjectData.lt || subjectEn || '';
        } catch (e) {
          subjectEn = row.subject || '';
          subjectLt = row.subject || '';
        }
        
        // Determine message type by checking for RSVP marker
        let messageType = 'custom';
        const bodyEn = row.body_en || '';
        const bodyLt = row.body_lt || '';
        
        if (bodyEn.includes('<!-- RSVP_CONFIRMATION_TYPE:attending -->') || 
            bodyLt.includes('<!-- RSVP_CONFIRMATION_TYPE:attending -->')) {
          messageType = 'rsvpAttending';
        } else if (bodyEn.includes('<!-- RSVP_CONFIRMATION_TYPE:not_attending -->') || 
                   bodyLt.includes('<!-- RSVP_CONFIRMATION_TYPE:not_attending -->')) {
          messageType = 'rsvpNotAttending';
        }
        
        messageMap.set(row.message_id, {
          messageId: row.message_id,
          subject: { en: subjectEn, lt: subjectLt },
          subjectKey: subjectEn.toLowerCase().trim(), // For grouping identical subjects
          messageType,
          created_at: row.created_at,
          recipients: [],
          failedRecipients: []
        });
      }
      
      const message = messageMap.get(row.message_id);
      if (row.recipient_id) {
        if (row.delivery_status === 'sent') {
          message.recipients.push({
            id: row.guest_id,
            name: row.guest_name || 'Unknown',
            email: row.guest_email || '',
            sentAt: row.sent_at,
            language: row.language || 'en'
          });
        } else if (row.delivery_status === 'failed') {
          message.failedRecipients.push({
            id: row.guest_id,
            name: row.guest_name || 'Unknown',
            email: row.guest_email || '',
            error: row.error_message || 'Unknown error',
            language: row.language || 'en'
          });
        }
      }
    }
    
    // Group messages by subject within each type
    const groupedBySubject = {
      custom: new Map(),
      rsvpAttending: new Map(),
      rsvpNotAttending: new Map()
    };
    
    for (const message of messageMap.values()) {
      const typeMap = groupedBySubject[message.messageType];
      const key = message.subjectKey;
      
      if (!typeMap.has(key)) {
        typeMap.set(key, {
          subject: message.subject,
          messageIds: [],
          allRecipients: [],
          allFailedRecipients: []
        });
      }
      
      const group = typeMap.get(key);
      group.messageIds.push(message.messageId);
      group.allRecipients.push(...message.recipients);
      group.allFailedRecipients.push(...message.failedRecipients);
    }
    
    // Process each type: calculate stats, group errors, add language breakdown
    const processType = (typeMap, page) => {
      const groups = Array.from(typeMap.values());
      
      // Sort alphabetically by subject (English)
      groups.sort((a, b) => {
        const subjA = (a.subject.en || a.subject.lt || '').toLowerCase();
        const subjB = (b.subject.en || b.subject.lt || '').toLowerCase();
        return subjA.localeCompare(subjB);
      });
      
      // Paginate
      const total = groups.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedGroups = groups.slice(startIndex, endIndex);
      
      // Process each group
      const processedMessages = paginatedGroups.map(group => {
        const totalSent = group.allRecipients.length;
        const totalFailed = group.allFailedRecipients.length;
        const uniqueRecipients = new Set(group.allRecipients.map(r => r.id)).size;
        
        // Group failed errors by similarity
        const errorGroups = new Map();
        for (const failed of group.allFailedRecipients) {
          const normalizedError = normalizeError(failed.error);
          if (!errorGroups.has(normalizedError)) {
            errorGroups.set(normalizedError, {
              errorMessage: normalizedError,
              originalError: failed.error,
              affectedGuests: []
            });
          }
          errorGroups.get(normalizedError).affectedGuests.push({
            id: failed.id,
            name: failed.name,
            email: failed.email
          });
        }
        
        // Language breakdown
        const languages = { en: 0, lt: 0 };
        for (const recipient of group.allRecipients) {
          const lang = recipient.language || 'en';
          languages[lang === 'lt' ? 'lt' : 'en']++;
        }
        
        return {
          subject: group.subject,
          totalSent,
          totalFailed,
          uniqueRecipients,
          messageIds: group.messageIds,
          failedDetails: Array.from(errorGroups.values()),
          sentRecipients: group.allRecipients,
          languages
        };
      });
      
      return {
        messages: processedMessages,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      };
    };
    
    return {
      custom: processType(groupedBySubject.custom, pageCustom),
      rsvpAttending: processType(groupedBySubject.rsvpAttending, pageRsvpAttending),
      rsvpNotAttending: processType(groupedBySubject.rsvpNotAttending, pageRsvpNotAttending)
    };
  } catch (err) {
    logger.error('[GUEST_ANALYTICS] Error fetching message stats by type:', err);
    // Return empty structure on error
    const emptyResult = {
      messages: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
    };
    return {
      custom: { ...emptyResult },
      rsvpAttending: { ...emptyResult },
      rsvpNotAttending: { ...emptyResult }
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
  getEmailsSentCount,
  getMessageStatsByType
};

