import api from './index.js'

/**
 * Fetch all messages
 * @returns {Promise<{success: boolean, messages: Array}>}
 */
export async function fetchMessages() {
  try {
    const response = await api.get('/messages')
    return response.data
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    throw error
  }
}

/**
 * Fetch a single message by ID
 * @param {number} messageId 
 * @returns {Promise<{success: boolean, message: Object}>}
 */
export async function fetchMessage(messageId) {
  try {
    const response = await api.get(`/messages/${messageId}`)
    return response.data
  } catch (error) {
    console.error('Failed to fetch message:', error)
    throw error
  }
}

/**
 * Create a new message (draft, scheduled, or sent)
 * @param {Object} messageData 
 * @param {string} messageData.subject
 * @param {string} messageData.body_en
 * @param {string} messageData.body_lt
 * @param {string} messageData.status - 'draft', 'scheduled', or 'sent'
 * @param {string} messageData.scheduledAt - ISO string for scheduled messages
 * @param {Array<number>} messageData.recipients - Array of guest IDs
 * @returns {Promise<{success: boolean, messageId: number}>}
 */
export async function createMessage(messageData) {
  try {
    const response = await api.post('/messages', messageData)
    return response.data
  } catch (error) {
    console.error('Failed to create message:', error)
    throw error
  }
}

/**
 * Update an existing message
 * @param {number} messageId 
 * @param {Object} messageData 
 * @returns {Promise<{success: boolean, message: Object}>}
 */
export async function updateMessage(messageId, messageData) {
  try {
    const response = await api.put(`/messages/${messageId}`, messageData)
    return response.data
  } catch (error) {
    console.error('Failed to update message:', error)
    throw error
  }
}

/**
 * Delete a message
 * @param {number} messageId 
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteMessage(messageId) {
  try {
    const response = await api.delete(`/messages/${messageId}`)
    return response.data
  } catch (error) {
    console.error('Failed to delete message:', error)
    throw error
  }
}

/**
 * Send a message to recipients
 * @param {number} messageId 
 * @param {Array<number>} guestIds - Optional array of guest IDs to send to
 * @returns {Promise<{success: boolean, results: Array, sentCount: number, failedCount: number}>}
 */
export async function sendMessage(messageId, guestIds = null) {
  try {
    const payload = guestIds && guestIds.length > 0 ? { guestIds } : {}
    const response = await api.post(`/messages/${messageId}/send`, payload)
    return response.data
  } catch (error) {
    console.error('Failed to send message:', error)
    throw error
  }
}

/**
 * Schedule a message for future sending
 * @param {number} messageId 
 * @param {string} scheduledFor - ISO datetime string
 * @returns {Promise<{success: boolean, scheduled_for: string}>}
 */
export async function scheduleMessage(messageId, scheduledFor) {
  try {
    const response = await api.post(`/messages/${messageId}/schedule`, {
      scheduled_for: scheduledFor
    })
    return response.data
  } catch (error) {
    console.error('Failed to schedule message:', error)
    throw error
  }
}

/**
 * Resend failed message deliveries
 * @param {number} messageId 
 * @returns {Promise<{success: boolean, results: Array, sentCount: number, failedCount: number}>}
 */
export async function resendFailed(messageId) {
  try {
    const response = await api.post(`/messages/${messageId}/resend`)
    return response.data
  } catch (error) {
    console.error('Failed to resend failed messages:', error)
    throw error
  }
}

/**
 * Get delivery logs for a message
 * @param {number} messageId 
 * @returns {Promise<{success: boolean, logs: Array}>}
 */
export async function getMessageLogs(messageId) {
  try {
    const response = await api.get(`/messages/${messageId}/logs`)
    return response.data
  } catch (error) {
    console.error('Failed to get message logs:', error)
    throw error
  }
}

/**
 * Preview a message with guest substitutions
 * @param {Object} template 
 * @param {Object} guest 
 * @returns {Promise<{success: boolean, subject: string, body: string}>}
 */
export async function previewMessage(template, guest) {
  try {
    const response = await api.post('/messages/preview', { template, guest })
    return response.data
  } catch (error) {
    console.error('Failed to preview message:', error)
    throw error
  }
} 