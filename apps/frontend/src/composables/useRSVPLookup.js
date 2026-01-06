/**
 * RSVP Lookup Composable
 * Consolidates guest lookup logic used across multiple components
 */

import { ref } from 'vue'
import { fetchGuestByCode } from '@/api/rsvp'
import { useLoading } from './useLoading'
import { useErrorHandler } from './useErrorHandler'

const ENABLE_LOGS = import.meta.env.VITE_ENABLE_LOGS === 'true'

/**
 * Composable for managing guest lookup state
 * @param {Object} options - Configuration options
 * @param {boolean} options.showLoader - Show global loader during lookup (default: false)
 * @param {Function} options.onSuccess - Callback when lookup succeeds
 * @returns {Object} Lookup state and utilities
 */
export function useRSVPLookup(options = {}) {
  const { showLoader = false, onSuccess = null } = options
  
  const guest = ref(null)
  const { loading, withLoading } = useLoading({ useGlobalLoader: showLoader })
  const { error, handleError, clearError, setError } = useErrorHandler({ showToast: false, showBanner: true })
  const submitting = ref(false)

  /**
   * Lookup guest by code
   * @param {string} code - RSVP code to lookup
   * @returns {Promise<Object|null>} Guest object or null
   */
  async function lookupGuest(code) {
    if (!code || !code.trim()) {
      setError('Please enter a valid RSVP code')
      return null
    }

    clearError()
    submitting.value = true
    guest.value = null

    try {
      const fetchedGuest = await withLoading(async () => {
        return await fetchGuestByCode(code.trim())
      })

      guest.value = fetchedGuest

      if (ENABLE_LOGS) {
        console.log('[useRSVPLookup] Guest found:', fetchedGuest?.name || 'unknown')
      }

      // Call success callback if provided
      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(fetchedGuest, code.trim())
      }

      return fetchedGuest
    } catch (err) {
      guest.value = null

      // Handle rate limit errors (429)
      if (err.response?.status === 429) {
        const rateLimitMessage = err.response?.data?.message || 'Too many requests. Please try again later.'
        setError(rateLimitMessage)
      } else {
        // Handle other errors
        handleError(err, 'Failed to lookup guest')
      }

      return null
    } finally {
      submitting.value = false
    }
  }

  /**
   * Clear guest and error state
   */
  function clearGuest() {
    guest.value = null
    clearError()
  }

  /**
   * Reset all state
   */
  function reset() {
    clearGuest()
    submitting.value = false
  }

  return {
    guest,
    loading,
    error,
    submitting,
    lookupGuest,
    clearGuest,
    reset
  }
}

