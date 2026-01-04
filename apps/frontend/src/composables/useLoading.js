/**
 * Loading State Composable
 * Provides reactive loading state management with optional global loader integration
 */

import { ref } from 'vue'
import { useLoaderStore } from '@/store/loader'

const ENABLE_LOGS = import.meta.env.VITE_ENABLE_LOGS === 'true'

/**
 * Composable for managing loading state
 * @param {Object} options - Configuration options
 * @param {boolean} options.useGlobalLoader - Whether to integrate with global loader store (default: false)
 * @returns {Object} Loading state and utilities
 */
export function useLoading(options = {}) {
  const { useGlobalLoader = false } = options
  
  const loading = ref(false)
  const globalLoader = useGlobalLoader ? useLoaderStore() : null

  /**
   * Set loading state
   * @param {boolean} value - Loading state value
   */
  function setLoading(value) {
    loading.value = value
    
    if (globalLoader) {
      if (value) {
        globalLoader.start()
      } else {
        globalLoader.finish()
      }
    }
  }

  /**
   * Execute an async function with automatic loading state management
   * @param {Function} fn - Async function to execute
   * @returns {Promise} Result of the async function
   */
  async function withLoading(fn) {
    if (typeof fn !== 'function') {
      return
    }

    setLoading(true)
    try {
      const result = await fn()
      return result
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    setLoading,
    withLoading
  }
}

