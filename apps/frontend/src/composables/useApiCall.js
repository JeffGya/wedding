/**
 * API Call Composable
 * Standardized API call wrapper with automatic loading and error handling
 */

import { ref } from 'vue'
import { useLoading } from './useLoading'
import { useErrorHandler } from './useErrorHandler'

const ENABLE_LOGS = import.meta.env.VITE_ENABLE_LOGS === 'true'

/**
 * Composable for standardized API calls
 * @param {Object} options - Configuration options
 * @param {boolean} options.showLoader - Use global loader store (default: false)
 * @param {boolean} options.showErrorToast - Show error toast (default: true)
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * @returns {Object} API call utilities
 */
export function useApiCall(options = {}) {
  const {
    showLoader = false,
    showErrorToast = true,
    onSuccess = null,
    onError = null
  } = options

  const { loading, withLoading: withLoadingState } = useLoading({ useGlobalLoader: showLoader })
  const { error, handleError } = useErrorHandler({ showToast: showErrorToast })

  /**
   * Execute an API call with automatic loading and error handling
   * @param {Function} apiCall - Async function that makes the API call
   * @param {Object} callOptions - Per-call options
   * @param {string} callOptions.errorMessage - Custom error message
   * @returns {Promise} Result of the API call
   */
  async function execute(apiCall, callOptions = {}) {
    if (typeof apiCall !== 'function') {
      throw new Error('API call must be a function')
    }

    const { errorMessage = null } = callOptions

    return await withLoadingState(async () => {
      try {
        const result = await apiCall()

        // Clear any previous errors
        error.value = ''

        // Call success callback if provided
        if (onSuccess && typeof onSuccess === 'function') {
          onSuccess(result)
        }

        return result
      } catch (err) {
        // Handle error
        handleError(err, errorMessage)

        // Call error callback if provided
        if (onError && typeof onError === 'function') {
          onError(err)
        }

        // Re-throw error so caller can handle if needed
        throw err
      }
    })
  }

  return {
    execute,
    loading,
    error
  }
}

