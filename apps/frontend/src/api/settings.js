import api from './index.js'

// ============================================================================
// EMAIL SETTINGS
// ============================================================================

/**
 * Fetch email settings
 * @returns {Promise<{provider: string, api_key: string, from_name: string, from_email: string, sender_name: string, sender_email: string, enabled: boolean}>}
 */
export async function fetchEmailSettings() {
  try {
    const { data } = await api.get('/settings/email', {
      meta: { showLoader: true }
    })
    return data
  } catch (error) {
    console.error('Failed to fetch email settings:', error)
    throw error
  }
}

/**
 * Update email settings
 * @param {Object} settings - Email settings object
 * @param {string} settings.provider - Email provider (e.g., 'resend')
 * @param {string} settings.api_key - API key for the provider
 * @param {string} settings.from_name - Display name for sender
 * @param {string} settings.from_email - Email address for sender
 * @param {string} settings.sender_name - Alternative sender name
 * @param {string} settings.sender_email - Alternative sender email
 * @param {boolean} settings.enabled - Whether email sending is enabled
 * @returns {Promise<{success: boolean, updated: number}>}
 */
export async function updateEmailSettings(settings) {
  try {
    const { data } = await api.post('/settings/email', settings, {
      meta: { showLoader: true }
    })
    return data
  } catch (error) {
    console.error('Failed to update email settings:', error)
    throw error
  }
}

/**
 * Fetch Resend quota status
 * @returns {Promise<{daily: {sent: number, limit: number, remaining: number, resetsAt: string}, monthly: {sent: number, limit: number, remaining: number, resetsAt: string}, queue: {length: number, validUntil: string}}>}
 */
export async function fetchQuotaStatus() {
  try {
    const { data } = await api.get('/settings/email/quota', {
      meta: { showLoader: false }
    })
    return data
  } catch (error) {
    console.error('Failed to fetch quota status:', error)
    throw error
  }
}

// ============================================================================
// GUEST SETTINGS (RSVP)
// ============================================================================

/**
 * Fetch guest RSVP settings
 * @returns {Promise<{rsvp_open: boolean, rsvp_deadline: string|null}>}
 */
export async function fetchGuestSettings() {
  try {
    const { data } = await api.get('/settings/guests', {
      meta: { showLoader: true }
    })
    return data
  } catch (error) {
    console.error('Failed to fetch guest settings:', error)
    throw error
  }
}

/**
 * Update guest RSVP settings
 * @param {Object} settings - Guest settings object
 * @param {boolean} settings.rsvp_open - Whether RSVP is open
 * @param {string|null} settings.rsvp_deadline - RSVP deadline (ISO string)
 * @returns {Promise<{rsvp_open: boolean, rsvp_deadline: string|null}>}
 */
export async function updateGuestSettings(settings) {
  try {
    const { data } = await api.post('/settings/guests', settings, {
      meta: { showLoader: true }
    })
    return data
  } catch (error) {
    console.error('Failed to update guest settings:', error)
    throw error
  }
}

// ============================================================================
// MAIN SETTINGS
// ============================================================================

/**
 * Fetch main site settings
 * @returns {Promise<{enableGlobalCountdown: boolean, weddingDate: string|null}>}
 */
export async function fetchMainSettings() {
  try {
    const { data } = await api.get('/settings/main', {
      meta: { showLoader: true }
    })
    return data
  } catch (error) {
    console.error('Failed to fetch main settings:', error)
    throw error
  }
}

/**
 * Update main site settings
 * @param {Object} settings - Main settings object
 * @param {boolean} settings.enable_global_countdown - Whether to show global countdown
 * @param {string|null} settings.wedding_date - Wedding date (ISO string)
 * @returns {Promise<{success: boolean}>}
 */
export async function updateMainSettings(settings) {
  try {
    const { data } = await api.put('/settings/main', settings, {
      meta: { showLoader: true }
    })
    return data
  } catch (error) {
    console.error('Failed to update main settings:', error)
    throw error
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Fetch all settings at once
 * @returns {Promise<{email: Object, guest: Object, main: Object}>}
 */
export async function fetchAllSettings() {
  try {
    const [emailSettings, guestSettings, mainSettings] = await Promise.all([
      fetchEmailSettings(),
      fetchGuestSettings(),
      fetchMainSettings()
    ])
    
    return {
      email: emailSettings,
      guest: guestSettings,
      main: mainSettings
    }
  } catch (error) {
    console.error('Failed to fetch all settings:', error)
    throw error
  }
}

/**
 * Test email configuration
 * @param {Object} emailSettings - Email settings to test
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function testEmailConfiguration(emailSettings) {
  try {
    const { data } = await api.post('/settings/email/test', emailSettings, {
      meta: { showLoader: true }
    })
    return data
  } catch (error) {
    console.error('Failed to test email configuration:', error)
    throw error
  }
}

/**
 * Validate email settings before saving
 * @param {Object} settings - Email settings to validate
 * @returns {Object} Validation result with errors array
 */
export function validateEmailSettings(settings) {
  const errors = []
  
  if (!settings.provider) {
    errors.push('Email provider is required')
  }
  
  if (!settings.api_key) {
    errors.push('API key is required')
  }
  
  if (!settings.from_email) {
    errors.push('From email is required')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.from_email)) {
    errors.push('From email must be a valid email address')
  }
  
  if (settings.sender_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.sender_email)) {
    errors.push('Sender email must be a valid email address')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate guest settings before saving
 * @param {Object} settings - Guest settings to validate
 * @returns {Object} Validation result with errors array
 */
export function validateGuestSettings(settings) {
  const errors = []
  
  if (settings.rsvp_open && !settings.rsvp_deadline) {
    errors.push('RSVP deadline is required when RSVP is open')
  }
  
  if (settings.rsvp_deadline) {
    const deadline = new Date(settings.rsvp_deadline)
    if (isNaN(deadline.getTime())) {
      errors.push('RSVP deadline must be a valid date')
    } else if (deadline <= new Date()) {
      errors.push('RSVP deadline must be in the future')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate main settings before saving
 * @param {Object} settings - Main settings to validate
 * @returns {Object} Validation result with errors array
 */
export function validateMainSettings(settings) {
  const errors = []
  
  if (settings.enable_global_countdown && !settings.wedding_date) {
    errors.push('Wedding date is required when global countdown is enabled')
  }
  
  if (settings.wedding_date) {
    const weddingDate = new Date(settings.wedding_date)
    if (isNaN(weddingDate.getTime())) {
      errors.push('Wedding date must be a valid date')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// ============================================================================
// TEST EMAIL
// ============================================================================

/**
 * Send a test email
 * @param {Object} testEmailData - Test email data
 * @param {Object} testEmailData.guestData - Guest data object
 * @param {number} testEmailData.templateId - Template ID
 * @param {string} testEmailData.templateStyle - Template style (elegant, modern, friendly)
 * @param {string} testEmailData.sendMode - Send mode ('immediate' or 'scheduled')
 * @param {string} testEmailData.recipientEmail - Recipient email address
 * @param {string} testEmailData.testLanguage - Test language ('en', 'lt', or 'both')
 * @param {boolean} testEmailData.healthCheckMode - Enable health check mode
 * @returns {Promise<{success: boolean, emailHtml: string, emailHtmlEn: string, emailHtmlLt: string, variables: Object, healthCheck: Object, message: string}>}
 */
export async function sendTestEmail(testEmailData) {
  try {
    const { data } = await api.post('/settings/email/test', testEmailData, {
      meta: { showLoader: true }
    })
    return data
  } catch (error) {
    console.error('Failed to send test email:', error)
    throw error
  }
} 