/**
 * Plus-One Management Service
 * Unified logic for creating, updating, and deleting plus-one guests
 * Now uses Guest model for all operations
 */

const logger = require('./logger');
const Guest = require('../db/models/guest');

/**
 * Handle plus-one create, update, or delete operations
 * @param {Object} db - Database connection (kept for backward compatibility, not used)
 * @param {Object} primaryGuest - Primary guest object with group_id, group_label, preferred_language
 * @param {string|null} plusOneName - Plus-one name (null/empty to delete)
 * @param {string|null} plusOneDietary - Plus-one dietary restrictions
 */
async function handlePlusOne(db, primaryGuest, plusOneName, plusOneDietary) {
  try {
    await Guest.handlePlusOne(primaryGuest, plusOneName, plusOneDietary);
  } catch (error) {
    logger.error('[PLUS_ONE] Error handling plus-one:', error);
    throw error;
  }
}

/**
 * Sync plus-one attending status when primary guest RSVPs
 * @param {Object} db - Database connection (kept for backward compatibility, not used)
 * @param {number} groupId - Group ID of the primary guest
 * @param {boolean} isAttending - Whether the primary guest is attending
 */
async function syncPlusOneAttendingStatus(db, groupId, isAttending) {
  try {
    await Guest.syncPlusOneAttendingStatus(groupId, isAttending);
  } catch (error) {
    logger.error('[PLUS_ONE] Error syncing plus-one status:', error);
    throw error;
  }
}

module.exports = {
  handlePlusOne,
  syncPlusOneAttendingStatus
};

