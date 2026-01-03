/**
 * Plus-One Management Service
 * Unified logic for creating, updating, and deleting plus-one guests
 */

const logger = require('./logger');
const { createDbHelpers } = require('../db/queryHelpers');

/**
 * Handle plus-one create, update, or delete operations
 * @param {Object} db - Database connection
 * @param {Object} primaryGuest - Primary guest object with group_id, group_label, preferred_language
 * @param {string|null} plusOneName - Plus-one name (null/empty to delete)
 * @param {string|null} plusOneDietary - Plus-one dietary restrictions
 */
async function handlePlusOne(db, primaryGuest, plusOneName, plusOneDietary) {
  const { dbGet, dbAll, dbRun } = createDbHelpers(db);
  const groupId = primaryGuest.group_id;
  const groupLabel = primaryGuest.group_label;
  const preferredLanguage = primaryGuest.preferred_language;
  
  // Find existing plus-one
  const existingPlusOne = await dbGet(
    'SELECT * FROM guests WHERE group_id = ? AND is_primary = 0 LIMIT 1',
    [groupId]
  );
  
  // Determine if we should delete (plusOneName is null or empty)
  const shouldDelete = !plusOneName || plusOneName.trim() === '';
  
  if (existingPlusOne && shouldDelete) {
    // Delete the plus one - first delete related message_recipients to avoid foreign key constraint
    const messageRecipients = await dbAll(
      'SELECT id FROM message_recipients WHERE guest_id = ?',
      [existingPlusOne.id]
    );
    
    if (messageRecipients.length > 0) {
      await dbRun('DELETE FROM message_recipients WHERE guest_id = ?', [existingPlusOne.id]);
    }
    
    await dbRun('DELETE FROM guests WHERE id = ?', [existingPlusOne.id]);
    logger.info(`[PLUS_ONE] Deleted plus-one: ${existingPlusOne.name} (group_id: ${groupId})`);
    
  } else if (plusOneName && plusOneName.trim() !== '') {
    // Create or update plus-one
    if (existingPlusOne) {
      // Update existing plus one
      await dbRun(
        `UPDATE guests SET name = ?, dietary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [plusOneName, plusOneDietary || null, existingPlusOne.id]
      );
      logger.info(`[PLUS_ONE] Updated plus-one: ${existingPlusOne.name} → ${plusOneName} (group_id: ${groupId})`);
    } else {
      // Insert new plus one
      await dbRun(
        `INSERT INTO guests (
          group_id, group_label, name, email, code,
          can_bring_plus_one, is_primary, preferred_language,
          attending, rsvp_deadline, dietary, notes, rsvp_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          groupId,
          groupLabel,
          plusOneName,
          null,
          null,
          0,
          0,
          preferredLanguage,
          null,
          null,
          plusOneDietary || null,
          null,
          'pending'
        ]
      );
      logger.info(`[PLUS_ONE] Created plus-one: ${plusOneName} (group_id: ${groupId})`);
    }
  }
}

/**
 * Sync plus-one attending status when primary guest RSVPs
 * @param {Object} db - Database connection
 * @param {number} groupId - Group ID of the primary guest
 * @param {boolean} isAttending - Whether the primary guest is attending
 */
async function syncPlusOneAttendingStatus(db, groupId, isAttending) {
  const { dbGet, dbRun } = createDbHelpers(db);
  
  if (isAttending === true) {
    // Check if plus-one exists
    const plusOne = await dbGet(
      'SELECT id, name, attending, rsvp_status FROM guests WHERE group_id = ? AND is_primary = 0 LIMIT 1',
      [groupId]
    );
    
    if (plusOne) {
      await dbRun(
        `UPDATE guests
         SET attending = 1,
             rsvp_status = 'attending',
             updated_at = CURRENT_TIMESTAMP
         WHERE group_id = ? AND is_primary = 0`,
        [groupId]
      );
      logger.info(`[PLUS_ONE] Synced attending status for plus-one: ${plusOne.name} (group_id: ${groupId})`);
    }
  }
}

module.exports = {
  handlePlusOne,
  syncPlusOneAttendingStatus
};

