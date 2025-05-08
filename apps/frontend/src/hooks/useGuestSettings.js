import { ref, onMounted } from 'vue'
import { fetchGuestSettings } from '@/api'

/**
 * Composable to load and track global RSVP settings for guests.
 * Provides loading state and a helper to determine if RSVPs are closed.
 */
export function useGuestSettings() {
  const settings = ref({
    rsvp_open: false,
    rsvp_deadline: null
  })
  const loading = ref(true)

  // Load settings on component mount
  onMounted(async () => {
    try {
      const data = await fetchGuestSettings()
      settings.value = data
    } catch (err) {
      console.error('Error loading guest settings:', err)
    } finally {
      loading.value = false
    }
  })

  /**
   * Determine if RSVPs are currently closed based on settings.
   * - Closed if toggle is off.
   * - Closed if a deadline is set and now is past the deadline.
   */
  function isClosed() {
    // 1) Toggle override
    if (!settings.value.rsvp_open) return true

    // 2) Deadline check
    const dl = settings.value.rsvp_deadline
    if (dl) {
      const deadlineDate = new Date(dl)
      if (isNaN(deadlineDate.getTime()) === false && new Date() > deadlineDate) {
        return true
      }
    }

    // Otherwise open
    return false
  }

  return {
    settings,
    loading,
    isClosed
  }
}