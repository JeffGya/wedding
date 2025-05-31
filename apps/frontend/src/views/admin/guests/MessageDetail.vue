<template>
  <h1 class="text-3xl font-bold mb-6">Message Detail</h1>
  <Card class="max-w-6xl mx-auto mt-6 p-6 relative">
    <template #content> 

      <Toast />
      <ConfirmDialog />

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

            <!-- Display scheduled time if the message is scheduled -->
            <div v-if="message.status === 'scheduled'" class="space-y-1">
              <h2 class="text-xl font-semibold">Scheduled Time:</h2>
              <p class="text-gray-800">
                {{ formatScheduledTime(message.scheduled_for) }}
              </p>
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
      class="sticky bottom-0 left-0 right-0 z-10 flex justify-between p-16 mt-8 bg-bg-glass backdrop-blur-sm"
      v-if="message"
    >
      <!-- Left: Delete button for drafts/scheduled -->
      <div>
        <Button
          v-if="message.status === 'draft' || message.status === 'scheduled'"
          label="Delete Message"
          icon="i-solar:pen-new-square-bold-duotone"
          severity="danger"
          @click="deleteMessage(message.id)"
        />
      </div>
      <!-- Right: Other actions -->
      <div class="flex gap-4">
        <Button
          v-if="message.status === 'draft' || message.status === 'scheduled'"
          label="Edit Message"
          icon="pi pi-pencil"
          class="p-button-warning"
          @click="$router.push(`/admin/guests/messages/${message.id}/edit`)"
        />
        <Button
          label="Resend Failed"
          icon="pi pi-redo"
          class="p-button-info"
          @click="resendFailed"
          :disabled="resendLoading"
        />
        <Button
          label="Back to Messages"
          icon="pi pi-arrow-left"
          class="p-button-secondary p-button-outlined"
          @click="$router.push('/admin/guests/messages')"
        />
      </div>
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

    </template> 
  </Card>

  <!-- Resend Summary Modal -->
  <Dialog
    v-model:visible="showSummaryModal"
    header="Resend Summary"
    modal
    class="w-full max-w-lg"
  >
    <div class="p-4">
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
      <div class="flex justify-end">
        <Button
          label="Close"
          icon="pi pi-times"
          class="p-button-primary"
          @click="showSummaryModal = false"
        />
      </div>
    </div>
  </Dialog>

</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import api from '@/api'
import Toast from 'primevue/toast';
import { useToast as usePrimeToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

const route = useRoute()
const router = useRouter()
const confirm = useConfirm();
const primeToast = usePrimeToast();
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

// New method to format the scheduled time
const formatScheduledTime = (scheduledAt) => {
  if (!scheduledAt) return 'N/A'
  const date = new Date(scheduledAt)
  // Format in Europe/Amsterdam timezone, preserving YYYY-MM-DD HH:mm
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Amsterdam'
  }).format(date)
}

onMounted(async () => {
  const res = await api.get(`/messages/${messageId}`)
  message.value = res.data.message

  const logRes = await api.get(`/messages/${messageId}/logs`)
  deliveryLogs.value = logRes.data.logs
  sentCount.value = logRes.data.sentCount || 0
  failedCount.value = logRes.data.failedCount || 0
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
    sentCount.value = deliveryLogs.value.filter(log => log.delivery_status === 'sent').length
    failedCount.value = deliveryLogs.value.filter(log => log.delivery_status === 'failed').length

    summarySentCount.value = sent
    summaryFailedCount.value = failed
    showSummaryModal.value = true
    primeToast.add({ severity: 'success', summary: 'Resend Complete', detail: `Sent: ${sent}, Failed: ${failed}` })

    console.log(`Resend complete. Sent: ${sent}, Failed: ${failed}`)
  } catch (err) {
    console.error('Failed to resend failed messages', err)
  } finally {
    resendLoading.value = false
    resendProgressMessage.value = ''
  }
}

async function deleteMessage(id) {
  confirm.require({
    message: 'Are you sure you want to delete this message?',
    header: 'Confirmation',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        await api.delete(`/messages/${id}`);
        router.push('/admin/guests/messages');
        primeToast.add({ severity: 'success', summary: 'Deleted', detail: 'Message deleted successfully' });
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    }
  });
}
</script>