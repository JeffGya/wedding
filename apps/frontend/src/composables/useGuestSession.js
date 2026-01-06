/**
 * Guest Session Composable
 * Centralizes guest session management logic
 */

import { ref, computed, onMounted } from 'vue'
import { fetchRSVPSession } from '@/api/rsvp'
import { useLoading } from './useLoading'
import { useErrorHandler } from './useErrorHandler'

const ENABLE_LOGS = import.meta.env.VITE_ENABLE_LOGS === 'true'

/**
 * Composable for managing guest session state
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoLoad - Automatically load session on mount (default: true)
 * @param {boolean} options.showLoader - Show global loader during session fetch (default: false)
 * @returns {Object} Session state and utilities
 */
export function useGuestSession(options = {}) {
  const { autoLoad = true, showLoader = false } = options
  
  const session = ref(null)
  const { loading, withLoading } = useLoading({ useGlobalLoader: showLoader })
  const { error, handleError, clearError } = useErrorHandler({ showToast: false, showBanner: false })

  /**
   * Check if a valid session exists
   * @returns {boolean}
   */
  const hasSession = computed(() => {
    return session.value !== null && session.value?.code !== undefined && session.value?.code !== null
  })

  /**
   * Get the session code
   * @returns {string|null}
   */
  const sessionCode = computed(() => {
    return session.value?.code || null
  })

  /**
   * Load session from API
   * @returns {Promise<Object|null>} Session object or null
   */
  async function loadSession() {
    clearError()
    
    try {
      const auth = await withLoading(async () => {
        return await fetchRSVPSession()
      })
      
      session.value = auth
      
      if (ENABLE_LOGS) {
        console.log('[useGuestSession] Session loaded:', auth?.code ? 'has code' : 'no code')
      }
      
      return auth
    } catch (err) {
      // Session fetch failed - likely no valid session
      session.value = null
      
      // Only log if it's not a 401/403 (expected when no session)
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        handleError(err, 'Failed to load session')
      }
      
      return null
    }
  }

  /**
   * Refresh session (reload from API)
   * @returns {Promise<Object|null>} Session object or null
   */
  async function refreshSession() {
    return await loadSession()
  }

  /**
   * Clear session state
   */
  function clearSession() {
    session.value = null
    clearError()
  }

  // Auto-load session on mount if enabled
  if (autoLoad) {
    onMounted(() => {
      loadSession()
    })
  }

  return {
    session,
    loading,
    error,
    hasSession,
    sessionCode,
    loadSession,
    refreshSession,
    clearSession
  }
}

