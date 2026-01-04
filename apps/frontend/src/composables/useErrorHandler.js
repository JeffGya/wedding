/**
 * Error Handler Composable
 * Standardized error handling with support for toast notifications and banner display
 */

import { ref } from 'vue'
import { useToastService } from '@/utils/toastService'

const ENABLE_LOGS = import.meta.env.VITE_ENABLE_LOGS === 'true'

/**
 * Composable for managing error state and handling errors
 * @param {Object} options - Configuration options
 * @param {boolean} options.showToast - Show error toast notifications (default: true)
 * @param {boolean} options.showBanner - Use banner component for errors (default: false)
 * @returns {Object} Error state and utilities
 */
export function useErrorHandler(options = {}) {
  const { showToast = true, showBanner = false } = options
  
  const error = ref('')
  const toastService = showToast ? useToastService() : null

  /**
   * Extract error message from various error formats
   * @param {Error|Object} err - Error object
   * @returns {string} Extracted error message
   */
  function extractErrorMessage(err) {
    if (!err) return 'An unknown error occurred'
    
    // API error response
    if (err.response?.data?.message) {
      return err.response.data.message
    }
    
    // API error response (alternative format)
    if (err.response?.data?.error?.message) {
      return err.response.data.error.message
    }
    
    // Error object with message
    if (err.message) {
      return err.message
    }
    
    // String error
    if (typeof err === 'string') {
      return err
    }
    
    // Fallback
    return 'An unknown error occurred'
  }

  /**
   * Handle an error
   * @param {Error|Object|string} err - Error to handle
   * @param {string} fallbackMessage - Fallback message if error extraction fails
   * @param {Object} options - Additional options
   * @param {string} options.title - Toast title (default: 'Error')
   * @param {number} options.life - Toast duration in ms (default: 3000)
   */
  function handleError(err, fallbackMessage = null, options = {}) {
    const { title = 'Error', life = 3000 } = options
    
    const errorMessage = extractErrorMessage(err) || fallbackMessage || 'An unknown error occurred'
    
    // Set reactive error ref for banner display
    if (showBanner) {
      error.value = errorMessage
    }
    
    // Show toast notification
    if (showToast && toastService) {
      toastService.showError(title, errorMessage, life)
    }
  }

  /**
   * Clear error state
   */
  function clearError() {
    error.value = ''
  }

  /**
   * Set error message directly
   * @param {string} message - Error message
   */
  function setError(message) {
    error.value = message
  }

  return {
    error,
    handleError,
    clearError,
    setError,
    extractErrorMessage
  }
}

