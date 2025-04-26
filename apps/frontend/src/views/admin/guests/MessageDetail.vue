<template>
  <div class="relative flex flex-col p-6 max-w-6xl mx-auto min-h-screen">
    <h1 class="text-3xl font-bold mb-6">Message Detail</h1>

    <div class="flex-1">
      <template v-if="message">
        <div class="md:flex md:gap-8">
          <!-- Left column: Message content -->
          <div class="md:w-1/2 space-y-6">
            <div>
              <h2 class="text-xl font-semibold">Subject:</h2>
              <p class="text-gray-800">{{ message.subject }}</p>
            </div>

            <div>
              <h2 class="text-xl font-semibold">Message Content (EN):</h2>
              <div class="prose bg-white p-4 rounded border" v-html="message.body_en"></div>
            </div>

            <div>
              <h2 class="text-xl font-semibold">Message Content (LT):</h2>
              <div class="prose bg-white p-4 rounded border" v-html="message.body_lt"></div>
            </div>

            <div>
              <h2 class="text-xl font-semibold">Status:</h2>
              <p class="text-gray-600 capitalize">{{ message.status }}</p>
            </div>

            <div>
              <h2 class="text-xl font-semibold">Delivery Summary:</h2>
              <div class="space-y-1">
                <p class="text-gray-700">Total Recipients: {{ deliveryLogs.length }}</p>
                <p :class="sentCount > 0 ? 'text-green-600' : 'text-gray-600'">Sent: {{ sentCount }}</p>
                <p :class="failedCount > 0 ? 'text-red-600' : 'text-gray-600'">Failed: {{ failedCount }}</p>
                <p :class="pendingCount > 0 ? 'text-yellow-600' : 'text-gray-600'">Pending: {{ pendingCount }}</p>
              </div>
            </div>
          </div>

          <!-- Right column: Recipients -->
          <div class="md:w-1/2 mt-8 md:mt-0">
            <h2 class="text-xl font-semibold mb-2">Recipients:</h2>
            <ul class="list-disc list-inside">
              <li v-for="log in deliveryLogs" :key="log.id">
                {{ log.name }} ({{ log.email }}) — 
                <span :class="{
                  'text-green-600': log.delivery_status === 'sent',
                  'text-yellow-600': log.delivery_status === 'pending',
                  'text-red-600': log.delivery_status === 'failed'
                }">{{ log.delivery_status }}</span>
              </li>
            </ul>
          </div>
        </div>
      </template>
      <template v-else>
        <p>Loading message details...</p>
      </template>
    </div>

    <!-- Sticky Button Bar -->
    <div
      class="sticky bottom-0 left-0 right-0 z-10 bg-white px-6 py-4 flex justify-end gap-4 border-t shadow-inner"
      v-if="message"
    >
      <button
        v-if="message.status === 'draft' || message.status === 'scheduled'"
        @click="$router.push(`/admin/guests/messages/${message.id}/edit`)"
        class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
      >
        Edit Message
      </button>
      <button
        @click="resendFailed"
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="resendLoading"
      >
        Resend Failed
      </button>
      <button
        @click="$router.push('/admin/guests/messages')"
        class="border border-gray-400 px-4 py-2 rounded hover:bg-gray-100"
      >
        Back to Messages
      </button>
    </div>

    <!-- Resend Loading Overlay -->
    <div
      v-if="resendLoading"
      class="fixed inset-0 bg-black bg-opacity-50 flex flex-col justify-center items-center z-50"
    >
      <div class="bg-white rounded p-6 shadow-lg max-w-md w-full text-center">
        <svg class="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <p class="text-lg font-semibold mb-2">Resending failed messages...</p>
        <p class="text-gray-700">{{ resendProgressMessage }}</p>
      </div>
    </div>

    <!-- Resend Summary Modal -->
    <div
      v-if="showSummaryModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
    >
      <div class="bg-white rounded-lg shadow-lg max-w-lg w-full p-6">
        <h2 class="text-2xl font-bold mb-4">Resend Summary</h2>
        <p class="mb-2">Sent: {{ summarySentCount }}</p>
        <p class="mb-4">Failed: {{ summaryFailedCount }}</p>
        <div v-if="summaryFailedCount > 0" class="mb-4 max-h-48 overflow-y-auto border rounded p-2">
          <h3 class="font-semibold mb-2">Failed Recipients:</h3>
          <ul class="list-disc list-inside text-sm text-red-600">
            <li v-for="err in retryErrors" :key="err.guest_id">
              {{ err.name || 'Guest ID ' + err.guest_id }}: {{ err.error }}
            </li>
          </ul>
        </div>
        <button
          @click="showSummaryModal = false"
          class="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api'

const route = useRoute()
const messageId = route.params.id

const message = ref(null)
const deliveryLogs = ref([])

const sentCount = ref(0)
const failedCount = ref(0)

const resendLoading = ref(false)
const resendProgressMessage = ref('')
const retryErrors = ref([])

const showSummaryModal = ref(false)
const summarySentCount = ref(0)
const summaryFailedCount = ref(0)

function updateDeliverySummary() {
  sentCount.value = deliveryLogs.value.filter(log => log.delivery_status === 'sent').length
  failedCount.value = deliveryLogs.value.filter(log => log.delivery_status === 'failed').length
}

onMounted(async () => {
  const res = await api.get(`/messages/${messageId}`)
  message.value = res.data.message

  const logRes = await api.get(`/messages/${messageId}/logs`)
  deliveryLogs.value = logRes.data.logs
  updateDeliverySummary()
})

const pendingCount = computed(() => {
  return deliveryLogs.value.length - sentCount.value - failedCount.value
})

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const resendFailed = async () => {
  try {
    console.log('Starting resend of failed messages...')
    resendLoading.value = true
    retryErrors.value = []
    resendProgressMessage.value = ''
    const failedRecipients = deliveryLogs.value.filter(log => log.delivery_status === 'failed')

    let sent = 0
    let failed = 0

    for (let i = 0; i < failedRecipients.length; i++) {
      const recipient = failedRecipients[i]
      resendProgressMessage.value = `Sending ${i + 1} of ${failedRecipients.length}...`
      console.log(`Resending message to guest_id ${recipient.guest_id} (${i + 1} of ${failedRecipients.length})`)
      let attempt = 0
      let success = false
      let lastError = null

      while (attempt < 3 && !success) {
        try {
          await delay(attempt === 0 ? 300 : 1000 * Math.pow(2, attempt - 1)) // 300ms, then exponential backoff
          const response = await api.post(`/messages/${messageId}/resend`, { guestId: recipient.guest_id })
          if (response.data.success) {
            success = true
          }
        } catch (error) {
          lastError = error
          if (error.response?.status !== 429) break
          attempt++
        }
      }

      if (success) {
        sent++
      } else {
        failed++
        retryErrors.value.push({
          guest_id: recipient.guest_id,
          name: recipient.name,
          error: lastError?.message || 'Unknown error'
        })
      }
    }

    // Refresh logs after resend attempts
    const logRes = await api.get(`/messages/${messageId}/logs`)
    deliveryLogs.value = logRes.data.logs
    updateDeliverySummary()

    summarySentCount.value = sent
    summaryFailedCount.value = failed
    showSummaryModal.value = true

    console.log(`Resend complete. Sent: ${sent}, Failed: ${failed}`)
  } catch (err) {
    console.error('Failed to resend failed messages', err)
  } finally {
    resendLoading.value = false
    resendProgressMessage.value = ''
  }
}
</script>