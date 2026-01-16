/**
 * Guest Model/Service
 * Centralized guest database operations with consistent data formatting
 */

const logger = require('../../helpers/logger');
const { createDbHelpers } = require('../queryHelpers');
const { convertAttendingToRsvpStatus } = require('../../helpers/rsvpStatus');
const { formatDateWithTime } = require('../../utils/dateFormatter');
const getDbConnection = require('../connection');

// Get database connection and create helpers
const db = getDbConnection();
const { dbGet, dbAll, dbRun } = createDbHelpers(db);

/**
 * Guest Model
 */
const Guest = {
  /**
   * Create a new guest
   * @param {Object} guestData - Guest data
   * @returns {Promise<Object>} Created guest with ID
   */
  async create(guestData) {
    try {
      const {
        group_id,
        group_label,
        name,
        email,
        code,
        can_bring_plus_one = 0,
        is_primary = 1,
        preferred_language = 'en',
        rsvp_deadline = null
      } = guestData;

      if (!group_label || !name || !code) {
        logger.warn('[GUEST_MODEL] Missing required fields for guest creation', { group_label, name, code });
        throw new Error('Missing required fields: group_label, name, and code are required');
      }

      const result = await dbRun(
        `INSERT INTO guests (
          group_id, group_label, name, email, code,
          can_bring_plus_one, is_primary, preferred_language, rsvp_deadline
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          group_id || null,
          group_label,
          name,
          email || null,
          code,
          can_bring_plus_one ? 1 : 0,
          is_primary ? 1 : 0,
          preferred_language,
          rsvp_deadline || null
        ]
      );

      const insertId = process.env.DB_TYPE === 'mysql' ? result.insertId : result.lastID;
      
      // Ensure group_id is set for primary guests (set to their own ID if not provided)
      if (is_primary && !group_id) {
        await dbRun('UPDATE guests SET group_id = ? WHERE id = ?', [insertId, insertId]);
        logger.info('[GUEST_MODEL] Set group_id for new primary guest', { id: insertId, group_id: insertId });
      }
      
      logger.info('[GUEST_MODEL] Guest created', { id: insertId, name, code });
      
      return { id: insertId, ...guestData, group_id: group_id || (is_primary ? insertId : null) };
    } catch (error) {
      logger.error('[GUEST_MODEL] Error creating guest', { error: error.message, guestData: { ...guestData, email: guestData.email ? '[REDACTED]' : null } });
      throw error;
    }
  },

  /**
   * Find guest by ID
   * @param {number} id - Guest ID
   * @param {Object} options - Formatting options
   * @returns {Promise<Object|null>} Guest object or null
   */
  async findById(id, options = {}) {
    try {
      const row = await dbGet('SELECT * FROM guests WHERE id = ?', [id]);
      
      if (!row) {
        return null;
      }

      // Ensure group_id is set for primary guests (backfill for existing data)
      if (row.is_primary && !row.group_id) {
        await dbRun('UPDATE guests SET group_id = ? WHERE id = ?', [id, id]);
        row.group_id = id;
        logger.info('[GUEST_MODEL] Set group_id for existing primary guest', { id, group_id: id });
      }

      const formatted = this.formatGuestData(row, options);
      
      // Add plus one information if this is a primary guest
      if (formatted.is_primary && formatted.group_id) {
        const plusOne = await this.findPlusOne(formatted.group_id);
        if (plusOne) {
          formatted.plus_one = {
            id: plusOne.id,
            name: plusOne.name,
            dietary: plusOne.dietary
          };
          formatted.has_plus_one = true;
          formatted.plus_one_name = plusOne.name;
          formatted.plus_one_dietary = plusOne.dietary;
        } else {
          formatted.plus_one = null;
          formatted.has_plus_one = false;
          formatted.plus_one_name = null;
          formatted.plus_one_dietary = null;
        }
      } else {
        formatted.plus_one = null;
        formatted.has_plus_one = false;
        formatted.plus_one_name = null;
        formatted.plus_one_dietary = null;
      }
      
      return formatted;
    } catch (error) {
      logger.error('[GUEST_MODEL] Error finding guest by ID', { id, error: error.message });
      throw error;
    }
  },

  /**
   * Find guest by invitation code
   * @param {string} code - Invitation code
   * @param {Object} options - Formatting options
   * @returns {Promise<Object|null>} Guest object or null
   */
  async findByCode(code, options = {}) {
    try {
      // Normalize code: trim whitespace and handle case sensitivity
      const normalizedCode = code ? String(code).trim() : '';
      if (!normalizedCode) {
        return null;
      }
      
      // Use case-insensitive comparison for both MySQL and SQLite
      // For MySQL: LOWER() ensures case-insensitive match regardless of collation
      // For SQLite: LOWER() is safe and maintains consistency
      const row = await dbGet(
        'SELECT * FROM guests WHERE LOWER(TRIM(code)) = LOWER(?) AND is_primary = 1',
        [normalizedCode]
      );
      
      if (!row) {
        return null;
      }

      const formatted = this.formatGuestData(row, options);
      
      return formatted;
    } catch (error) {
      logger.error('[GUEST_MODEL] Error finding guest by code', { code, error: error.message });
      throw error;
    }
  },

  /**
   * Find all guests in a group
   * @param {number} groupId - Group ID
   * @param {Object} options - Formatting options
   * @returns {Promise<Array>} Array of guest objects
   */
  async findByGroupId(groupId, options = {}) {
    try {
      const rows = await dbAll('SELECT * FROM guests WHERE group_id = ? ORDER BY is_primary DESC, id ASC', [groupId]);
      
      const formatted = rows.map(row => this.formatGuestData(row, options));
      
      return formatted;
    } catch (error) {
      logger.error('[GUEST_MODEL] Error finding guests by group ID', { groupId, error: error.message });
      throw error;
    }
  },

  /**
   * Update guest
   * @param {number} id - Guest ID
   * @param {Object} guestData - Guest data to update
   * @returns {Promise<Object>} Success object
   */
  async update(id, guestData) {
    try {
      // Check if guest exists
      const existing = await dbGet('SELECT * FROM guests WHERE id = ?', [id]);
      if (!existing) {
        logger.warn('[GUEST_MODEL] Guest not found for update', { id });
        throw new Error(`Guest with ID ${id} not found`);
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];

      if (guestData.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(guestData.name);
      }
      if (guestData.email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(guestData.email || null);
      }
      if (guestData.group_label !== undefined) {
        updateFields.push('group_label = ?');
        updateValues.push(guestData.group_label);
      }
      if (guestData.code !== undefined) {
        updateFields.push('code = ?');
        updateValues.push(guestData.code);
      }
      if (guestData.can_bring_plus_one !== undefined) {
        updateFields.push('can_bring_plus_one = ?');
        updateValues.push(guestData.can_bring_plus_one ? 1 : 0);
      }
      if (guestData.is_primary !== undefined) {
        updateFields.push('is_primary = ?');
        updateValues.push(guestData.is_primary ? 1 : 0);
      }
      if (guestData.preferred_language !== undefined) {
        updateFields.push('preferred_language = ?');
        updateValues.push(guestData.preferred_language);
      }
      if (guestData.attending !== undefined) {
        updateFields.push('attending = ?');
        updateValues.push(guestData.attending ? 1 : 0);
      }
      if (guestData.rsvp_status !== undefined) {
        updateFields.push('rsvp_status = ?');
        updateValues.push(guestData.rsvp_status);
      }
      if (guestData.dietary !== undefined) {
        updateFields.push('dietary = ?');
        updateValues.push(guestData.dietary || null);
      }
      if (guestData.notes !== undefined) {
        updateFields.push('notes = ?');
        updateValues.push(guestData.notes || null);
      }
      if (guestData.rsvp_deadline !== undefined) {
        updateFields.push('rsvp_deadline = ?');
        updateValues.push(guestData.rsvp_deadline || null);
      }

      if (updateFields.length === 0) {
        return { success: true };
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(id);

      await dbRun(
        `UPDATE guests SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      logger.info('[GUEST_MODEL] Guest updated', { id, fields: updateFields.length });
      
      return { success: true };
    } catch (error) {
      logger.error('[GUEST_MODEL] Error updating guest', { id, error: error.message });
      throw error;
    }
  },

  /**
   * Delete guest
   * @param {number} id - Guest ID
   * @returns {Promise<Object>} Success object
   */
  async delete(id) {
    try {
      // Check if guest exists
      const existing = await dbGet('SELECT * FROM guests WHERE id = ?', [id]);
      if (!existing) {
        logger.warn('[GUEST_MODEL] Guest not found for deletion', { id });
        throw new Error(`Guest with ID ${id} not found`);
      }

      // Delete related message_recipients first to avoid foreign key constraint
      const messageRecipients = await dbAll('SELECT id FROM message_recipients WHERE guest_id = ?', [id]);
      if (messageRecipients.length > 0) {
        await dbRun('DELETE FROM message_recipients WHERE guest_id = ?', [id]);
      }

      await dbRun('DELETE FROM guests WHERE id = ?', [id]);
      
      logger.info('[GUEST_MODEL] Guest deleted', { id, name: existing.name });
      
      return { success: true };
    } catch (error) {
      logger.error('[GUEST_MODEL] Error deleting guest', { id, error: error.message });
      throw error;
    }
  },

  /**
   * Format guest data for API responses
   * @param {Object} guest - Raw guest data from database
   * @param {Object} options - Formatting options
   * @returns {Object} Formatted guest object
   */
  formatGuestData(guest, options = {}) {
    if (!guest) return null;

    const {
      formatDates = 'iso', // 'iso', 'human', 'both'
      includeAllFields = true
    } = options;


    const formatted = { ...guest };

    // Format dates based on options
    if (formatDates === 'human' || formatDates === 'both') {
      if (guest.rsvp_deadline) {
        formatted.rsvp_deadline = formatDates === 'both' 
          ? { iso: new Date(guest.rsvp_deadline).toISOString(), formatted: formatDateWithTime(guest.rsvp_deadline) }
          : formatDateWithTime(guest.rsvp_deadline);
      }
      if (guest.updated_at) {
        formatted.updated_at = formatDates === 'both'
          ? { iso: new Date(guest.updated_at).toISOString(), formatted: formatDateWithTime(guest.updated_at) }
          : formatDateWithTime(guest.updated_at);
      }
    } else if (formatDates === 'iso') {
      if (guest.rsvp_deadline) {
        formatted.rsvp_deadline = new Date(guest.rsvp_deadline).toISOString();
      }
      if (guest.updated_at) {
        formatted.updated_at = new Date(guest.updated_at).toISOString();
      }
    }

    // Convert boolean fields
    if (guest.can_bring_plus_one !== undefined) {
      formatted.can_bring_plus_one = Boolean(guest.can_bring_plus_one);
    }
    if (guest.is_primary !== undefined) {
      formatted.is_primary = Boolean(guest.is_primary);
    }
    if (guest.attending !== undefined && guest.attending !== null) {
      formatted.attending = Boolean(guest.attending);
    }

    return formatted;
  },

  /**
   * Find guest by code with plus-one data (for public RSVP lookup)
   * @param {string} code - Invitation code
   * @returns {Promise<Object>} { primary: guest, plusOne: guest | null }
   */
  async findByCodeWithPlusOne(code) {
    try {
      // Normalize code: trim whitespace and handle case sensitivity
      const normalizedCode = code ? String(code).trim() : '';
      if (!normalizedCode) {
        return null;
      }
      
      // Use case-insensitive comparison for both MySQL and SQLite
      // For MySQL: LOWER() ensures case-insensitive match regardless of collation
      // For SQLite: LOWER() is safe and maintains consistency
      const rows = await dbAll(
        `SELECT id, group_label, name, email, code, is_primary, can_bring_plus_one, dietary, notes, attending, rsvp_status, rsvp_deadline 
         FROM guests WHERE LOWER(TRIM(code)) = LOWER(?) OR (group_id = (SELECT group_id FROM guests WHERE LOWER(TRIM(code)) = LOWER(?)) AND is_primary = 0)`,
        [normalizedCode, normalizedCode]
      );

      if (!rows || rows.length === 0) {
        return null;
      }

      const primaryGuest = rows.find(row => row.is_primary);
      const plusOne = rows.find(row => !row.is_primary);

      if (!primaryGuest) {
        logger.warn('[GUEST_MODEL] Primary guest not found in group', { code });
        return null;
      }

      // Format dates for public RSVP
      const primary = { ...primaryGuest };
      if (primary.rsvp_deadline) {
        primary.rsvp_deadline_formatted = formatDateWithTime(primary.rsvp_deadline);
        primary.rsvp_deadline = new Date(primary.rsvp_deadline).toISOString();
      }

      return {
        primary,
        plusOne: plusOne ? { ...plusOne } : null
      };
    } catch (error) {
      logger.error('[GUEST_MODEL] Error finding guest by code with plus-one', { code, error: error.message });
      throw error;
    }
  },

  /**
   * Update RSVP for a guest
   * @param {number} id - Guest ID
   * @param {Object} rsvpData - RSVP data
   * @returns {Promise<Object>} Success object
   */
  async updateRsvp(id, rsvpData) {
    try {
      // Get existing guest
      const existing = await dbGet('SELECT * FROM guests WHERE id = ?', [id]);
      if (!existing) {
        logger.warn('[GUEST_MODEL] Guest not found for RSVP update', { id });
        throw new Error(`Guest with ID ${id} not found`);
      }

      const attendingProvided = typeof rsvpData.attending !== 'undefined';
      const attendingValue = attendingProvided ? rsvpData.attending : existing.attending;
      const rsvpStatusVal = convertAttendingToRsvpStatus(attendingValue, existing.rsvp_status, attendingProvided);

      // Clear dietary and notes when not attending
      const finalDietary = attendingValue === false ? null : (rsvpData.dietary !== undefined ? rsvpData.dietary : existing.dietary);
      const finalNotes = attendingValue === false ? null : (rsvpData.notes !== undefined ? rsvpData.notes : existing.notes);

      await dbRun(
        `UPDATE guests SET
          attending = ?,
          rsvp_status = ?,
          dietary = ?,
          notes = ?,
          rsvp_deadline = ?,
          responded_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          attendingValue !== null && attendingValue !== undefined ? (attendingValue ? 1 : 0) : null,
          rsvpStatusVal,
          finalDietary,
          finalNotes,
          rsvpData.rsvp_deadline !== undefined ? (rsvpData.rsvp_deadline || null) : existing.rsvp_deadline,
          id
        ]
      );

      logger.info('[GUEST_MODEL] RSVP updated', { id, rsvpStatus: rsvpStatusVal });
      
      return { success: true };
    } catch (error) {
      logger.error('[GUEST_MODEL] Error updating RSVP', { id, error: error.message });
      throw error;
    }
  },

  /**
   * List guests with filtering, sorting, and pagination
   * @param {Object} filters - Filter criteria
   * @param {Object} options - Query options (sorting, pagination, formatting)
   * @returns {Promise<Object>} { guests: [], total: number }
   */
  async list(filters = {}, options = {}) {
    try {
      let query = `
        SELECT
          id, group_id, group_label, name, preferred_language, email, code,
          can_bring_plus_one, is_primary, attending,
          rsvp_status, dietary, notes, rsvp_deadline, updated_at
        FROM guests
      `;

      const queryParams = [];
      const whereClauses = [];

      // Apply filters
      if (filters.attending !== undefined) {
        whereClauses.push(`attending = ?`);
        queryParams.push(filters.attending === 'true' || filters.attending === true ? 1 : 0);
      }
      if (filters.group_id !== undefined) {
        whereClauses.push(`group_id = ?`);
        queryParams.push(filters.group_id);
      }
      if (filters.rsvp_status !== undefined) {
        whereClauses.push(`rsvp_status = ?`);
        queryParams.push(filters.rsvp_status);
      }

      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }

      // Apply sorting
      const sortBy = options.sort_by || 'default';
      if (sortBy === 'name') {
        query += ` ORDER BY name ASC`;
      } else if (sortBy === 'updated_at') {
        query += ` ORDER BY updated_at DESC`;
      } else {
        query += ` ORDER BY group_id ASC, id ASC`;
      }

      // Get total count before pagination
      let countQuery = `SELECT COUNT(*) as total FROM guests`;
      if (whereClauses.length > 0) {
        countQuery += ' WHERE ' + whereClauses.join(' AND ');
      }
      const countResult = await dbGet(countQuery, queryParams);
      const total = countResult?.total || 0;

      // Apply pagination
      const page = parseInt(options.page) || 1;
      const perPage = parseInt(options.per_page) || 40;
      const limit = perPage;
      const offset = (page - 1) * limit;
      query += ` LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);

      const rows = await dbAll(query, queryParams);
      
      // Backfill group_id for primary guests that don't have it (on-the-fly, no migration needed)
      const guestsNeedingGroupId = rows.filter(r => r.is_primary && !r.group_id);
      if (guestsNeedingGroupId.length > 0) {
        for (const guest of guestsNeedingGroupId) {
          await dbRun('UPDATE guests SET group_id = ? WHERE id = ?', [guest.id, guest.id]);
          guest.group_id = guest.id;
        }
        logger.info('[GUEST_MODEL] Backfilled group_id for primary guests', { count: guestsNeedingGroupId.length });
      }
      
      // Get all plus ones grouped by group_id for efficient lookup
      const groupIds = [...new Set(rows.map(r => r.group_id).filter(id => id !== null))];
      const plusOnesByGroup = {};
      if (groupIds.length > 0) {
        const placeholders = groupIds.map(() => '?').join(',');
        const plusOneRows = await dbAll(
          `SELECT id, group_id, name, dietary FROM guests WHERE group_id IN (${placeholders}) AND is_primary = 0`,
          groupIds
        );
        plusOneRows.forEach(po => {
          if (!plusOnesByGroup[po.group_id]) {
            plusOnesByGroup[po.group_id] = [];
          }
          plusOnesByGroup[po.group_id].push({
            id: po.id,
            name: po.name,
            dietary: po.dietary
          });
        });
      }
      
      // Format dates as human-readable strings (for list view)
      const formattedGuests = rows.map(row => {
        const formatted = { ...row };
        if (formatted.rsvp_deadline) {
          formatted.rsvp_deadline = formatDateWithTime(formatted.rsvp_deadline);
        }
        if (formatted.updated_at) {
          formatted.updated_at = formatDateWithTime(formatted.updated_at);
        }
        // Convert boolean fields
        formatted.can_bring_plus_one = Boolean(formatted.can_bring_plus_one);
        formatted.is_primary = Boolean(formatted.is_primary);
        if (formatted.attending !== null && formatted.attending !== undefined) {
          formatted.attending = Boolean(formatted.attending);
        }
        
        // Add plus one information for primary guests
        if (formatted.is_primary && formatted.group_id && plusOnesByGroup[formatted.group_id]) {
          const plusOnes = plusOnesByGroup[formatted.group_id];
          formatted.plus_one = plusOnes.length > 0 ? plusOnes[0] : null; // Take first plus one
          formatted.has_plus_one = plusOnes.length > 0;
          formatted.plus_one_name = plusOnes.length > 0 ? plusOnes[0].name : null;
          formatted.plus_one_dietary = plusOnes.length > 0 ? plusOnes[0].dietary : null;
        } else {
          formatted.plus_one = null;
          formatted.has_plus_one = false;
          formatted.plus_one_name = null;
          formatted.plus_one_dietary = null;
        }
        
        return formatted;
      });

      logger.info('[GUEST_MODEL] Guests listed', { count: formattedGuests.length, total, page, perPage });
      
      return { guests: formattedGuests, total };
    } catch (error) {
      logger.error('[GUEST_MODEL] Error listing guests', { filters, options, error: error.message });
      throw error;
    }
  },

  /**
   * Find plus-one for a group
   * @param {number} groupId - Group ID
   * @returns {Promise<Object|null>} Plus-one guest or null
   */
  async findPlusOne(groupId) {
    try {
      const plusOne = await dbGet(
        'SELECT * FROM guests WHERE group_id = ? AND is_primary = 0 LIMIT 1',
        [groupId]
      );

      return plusOne || null;
    } catch (error) {
      logger.error('[GUEST_MODEL] Error finding plus-one', { groupId, error: error.message });
      throw error;
    }
  },

  /**
   * Create plus-one guest
   * @param {Object} primaryGuest - Primary guest object
   * @param {Object} plusOneData - Plus-one data
   * @returns {Promise<Object>} Created plus-one with ID
   */
  async createPlusOne(primaryGuest, plusOneData) {
    try {
      const result = await dbRun(
        `INSERT INTO guests (
          group_id, group_label, name, email, code,
          can_bring_plus_one, is_primary, preferred_language,
          attending, rsvp_deadline, dietary, notes, rsvp_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          primaryGuest.group_id,
          primaryGuest.group_label,
          plusOneData.name,
          null,
          null,
          0,
          0,
          primaryGuest.preferred_language || 'en',
          null,
          null,
          plusOneData.dietary || null,
          null,
          'pending'
        ]
      );

      const insertId = process.env.DB_TYPE === 'mysql' ? result.insertId : result.lastID;
      logger.info('[GUEST_MODEL] Plus-one created', { id: insertId, groupId: primaryGuest.group_id, name: plusOneData.name });
      
      return { id: insertId, ...plusOneData };
    } catch (error) {
      logger.error('[GUEST_MODEL] Error creating plus-one', { groupId: primaryGuest.group_id, error: error.message });
      throw error;
    }
  },

  /**
   * Update plus-one guest
   * @param {number} groupId - Group ID
   * @param {Object} plusOneData - Plus-one data to update
   * @returns {Promise<Object>} Success object
   */
  async updatePlusOne(groupId, plusOneData) {
    try {
      const existing = await this.findPlusOne(groupId);
      if (!existing) {
        logger.warn('[GUEST_MODEL] Plus-one not found for update', { groupId });
        throw new Error(`Plus-one for group ${groupId} not found`);
      }

      await dbRun(
        `UPDATE guests SET name = ?, dietary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [plusOneData.name, plusOneData.dietary || null, existing.id]
      );

      logger.info('[GUEST_MODEL] Plus-one updated', { groupId, id: existing.id, name: plusOneData.name });
      
      return { success: true };
    } catch (error) {
      logger.error('[GUEST_MODEL] Error updating plus-one', { groupId, error: error.message });
      throw error;
    }
  },

  /**
   * Delete plus-one guest
   * @param {number} groupId - Group ID
   * @returns {Promise<Object>} Success object
   */
  async deletePlusOne(groupId) {
    try {
      const existing = await this.findPlusOne(groupId);
      if (!existing) {
        return { success: true }; // Already deleted, return success
      }

      // Delete related message_recipients first
      const messageRecipients = await dbAll(
        'SELECT id FROM message_recipients WHERE guest_id = ?',
        [existing.id]
      );
      
      if (messageRecipients.length > 0) {
        await dbRun('DELETE FROM message_recipients WHERE guest_id = ?', [existing.id]);
      }

      await dbRun('DELETE FROM guests WHERE id = ?', [existing.id]);
      
      logger.info('[GUEST_MODEL] Plus-one deleted', { groupId, id: existing.id, name: existing.name });
      
      return { success: true };
    } catch (error) {
      logger.error('[GUEST_MODEL] Error deleting plus-one', { groupId, error: error.message });
      throw error;
    }
  },

  /**
   * Handle plus-one create, update, or delete operations
   * @param {Object} primaryGuest - Primary guest object
   * @param {string|null} plusOneName - Plus-one name (null/empty to delete)
   * @param {string|null} plusOneDietary - Plus-one dietary restrictions
   * @returns {Promise<Object>} Result object
   */
  async handlePlusOne(primaryGuest, plusOneName, plusOneDietary) {
    try {
      const existingPlusOne = await this.findPlusOne(primaryGuest.group_id);
      const shouldDelete = !plusOneName || plusOneName.trim() === '';

      if (existingPlusOne && shouldDelete) {
        await this.deletePlusOne(primaryGuest.group_id);
        return { action: 'deleted', success: true };
      } else if (plusOneName && plusOneName.trim() !== '') {
        if (existingPlusOne) {
          await this.updatePlusOne(primaryGuest.group_id, {
            name: plusOneName,
            dietary: plusOneDietary || null
          });
          return { action: 'updated', success: true };
        } else {
          const result = await this.createPlusOne(primaryGuest, {
            name: plusOneName,
            dietary: plusOneDietary || null
          });
          return { action: 'created', success: true, id: result.id };
        }
      }

      return { action: 'none', success: true };
    } catch (error) {
      logger.error('[GUEST_MODEL] Error handling plus-one', { groupId: primaryGuest.group_id, error: error.message });
      throw error;
    }
  },

  /**
   * Sync plus-one attending status when primary guest RSVPs
   * @param {number} groupId - Group ID
   * @param {boolean} isAttending - Whether the primary guest is attending
   * @returns {Promise<Object>} Success object
   */
  async syncPlusOneAttendingStatus(groupId, isAttending) {
    try {
      if (isAttending === true) {
        const plusOne = await this.findPlusOne(groupId);
        
        if (plusOne) {
          await dbRun(
            `UPDATE guests
             SET attending = 1,
                 rsvp_status = 'attending',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [plusOne.id]
          );
          logger.info('[GUEST_MODEL] Plus-one status synced', { groupId, id: plusOne.id, name: plusOne.name });
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('[GUEST_MODEL] Error syncing plus-one status', { groupId, error: error.message });
      throw error;
    }
  },

  /**
   * Validate guest data
   * @param {Object} guestData - Guest data to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateGuestData(guestData, options = {}) {
    const {
      requireCode = false,
      requireName = false,
      requireGroupLabel = false,
      requireEmail = false
    } = options;


    const errors = [];

    if (requireCode && !guestData.code) {
      errors.push('code is required');
    }
    if (requireName && !guestData.name) {
      errors.push('name is required');
    }
    if (requireGroupLabel && !guestData.group_label) {
      errors.push('group_label is required');
    }
    if (requireEmail && !guestData.email) {
      errors.push('email is required');
    }

    // Email format validation
    if (guestData.email && !/^\S+@\S+\.\S+$/.test(guestData.email)) {
      errors.push('Invalid email format');
    }

    // Preferred language validation
    if (guestData.preferred_language && !['en', 'lt'].includes(guestData.preferred_language)) {
      errors.push('preferred_language must be either "en" or "lt"');
    }

    // RSVP deadline validation
    if (guestData.rsvp_deadline && isNaN(Date.parse(guestData.rsvp_deadline))) {
      errors.push('rsvp_deadline must be a valid datetime string');
    }

    const isValid = errors.length === 0;
    
    if (!isValid) {
      logger.warn('[GUEST_MODEL] Validation failed', { errors });
    }

    return { isValid, errors };
  }
};

module.exports = Guest;

