<template>
  <h1 class="text-3xl font-bold text-gray-800 mb-6 px-6">{{ isEditMode ? 'Edit Message' : 'New Message' }}</h1>
    <div class="grid gap-6 w-full px-4 box-border grid-cols-1 md:grid-cols-3">
      <!-- Left (Message Composer) -->
      <div class="md:col-span-2 bg-gray-100 w-full">
        <MessageComposer
          ref="composerRef"
          :templates="templates"
          @save="() => handleComposerAction('draft')"
          @schedule="() => handleComposerAction('scheduled')"
          @send-now="() => handleComposerAction('sent')"
        />
        <div v-show="true" class="mt-4">
          <label for="schedule-time" class="block text-sm font-medium text-gray-700 mb-1">Schedule time</label>
          <VueDatePicker
            v-model="scheduledAt"
            @change="onManualDateInput"
            :format="'yyyy-MM-dd HH:mm'"
            type="datetime"
            placeholder="Select date and time"
            class="w-full max-w-full"
          />
        </div>
      </div>
      <!-- Right (Recipient Picker) -->
      <div class="md:col-span-1 bg-gray-100 w-full">
        <h2 class="text-xl font-semibold text-gray-700 mb-2">Recipients</h2>
        <RecipientPicker ref="recipientsRef" />
      </div>
    </div>
    <div class="fixed bottom-0 left-0 right-0 z-10 bg-white px-6 py-4 flex justify-end gap-4 border-t shadow">
        <MessageActionBar
          :templates="templates"
          @save="() => handleComposerAction('draft')"
          @schedule="() => handleComposerAction('scheduled')"
          @send-now="() => handleComposerAction('sent')"
          @open-template-modal="isTemplateModalOpen = true"
        />
    </div>
    <SaveTemplateModal
      v-if="isTemplateModalOpen"
      :show="isTemplateModalOpen"
      :subject="composerRef?.getData()?.subject || ''"
      :bodyEn="composerRef?.getData()?.body_en || ''"
      :bodyLt="composerRef?.getData()?.body_lt || ''"
      :templates="templates"
      @close="isTemplateModalOpen = false"
      @saved="handleTemplateSaved"
    />
  <!-- Full screen loading overlay -->
  <div v-if="sendingState === 'sending'" class="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80">
    <div class="text-center">
      <div class="text-2xl font-semibold mb-4">{{ sendingStatusMessage }}</div>
      <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
    </div>
  </div>

  <!-- Summary after sending -->
  <div v-if="sendingState === 'summary'" class="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-80">
    <div class="bg-white p-8 rounded shadow text-center">
      <h2 class="text-2xl font-bold mb-4">Sending Complete</h2>
      <p v-if="sendingSummary.error" class="text-red-500 mb-4">{{ sendingSummary.error }}</p>
      <p class="mb-2">✅ Sent: {{ sendingSummary.sentCount }}</p>
      <p class="mb-6">❌ Failed: {{ sendingSummary.failedCount }}</p>
      <button @click="handleSummaryDismiss" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Continue</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import MessageComposer from '@/components/messaging/MessageComposer.vue'
import RecipientPicker from '@/components/messaging/RecipientPicker.vue'
import { useToast } from 'vue-toastification'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import MessageActionBar from '@/components/messaging/MessageActionBar.vue'
import SaveTemplateModal from '@/components/messaging/SaveTemplateModal.vue'

const router = useRouter()
const toast = useToast()

const composerRef = ref(null)
const recipientsRef = ref(null)
const scheduledAt = ref(null)
const actionTypeBeingHandled = ref(null)
const templates = ref([])
const isTemplateModalOpen = ref(false)

const sendingState = ref('idle') // idle | sending | summary
const sendingSummary = ref({ sentCount: 0, failedCount: 0 })
const sendingStatusMessage = ref('Saving your message...')

const route = useRoute()
const isEditMode = ref(false)
const messageId = ref(null)

const onDateChange = (newValue) => {
  if (!newValue) return
  const previous = scheduledAt.value ? new Date(scheduledAt.value) : null
  const updated = new Date(newValue)

  // If previous exists, try to preserve the missing part
  if (previous) {
    if (
      previous.toDateString() !== updated.toDateString() &&
      previous.getHours() !== 0 &&
      previous.getMinutes() !== 0
    ) {
      // Preserve previous time
      updated.setHours(previous.getHours())
      updated.setMinutes(previous.getMinutes())
    } else if (
      previous.toTimeString() !== updated.toTimeString() &&
      previous.getFullYear() !== 1970
    ) {
      // Preserve previous date
      updated.setFullYear(previous.getFullYear())
      updated.setMonth(previous.getMonth())
      updated.setDate(previous.getDate())
    }
  }

  scheduledAt.value = updated
}

const onManualDateInput = (event) => {
  const input = event.target?.value
  if (!input) return

  const parsed = new Date(input)
  if (!isNaN(parsed)) {
    scheduledAt.value = parsed
  } else {
    toast.error('Invalid date format. Use yyyy-MM-dd HH:mm')
  }
}

const handleComposerAction = async (actionType) => {
  actionTypeBeingHandled.value = actionType
  const composerData = composerRef.value?.getData()
  const selectedRecipients = recipientsRef.value?.getSelectedGuestIds()

  if (!composerData?.subject || !composerData?.body_en || !selectedRecipients?.length) {
    toast.error('Please fill out the message and select at least one recipient.')
    return
  }

  if (actionType === 'scheduled' && !scheduledAt.value) {
    toast.error('Please select a date and time before scheduling.')
    return
  }

  const payload = {
    subject: composerData.subject,
    body_en: composerData.body_en,
    body_lt: composerData.body_lt,
    status: 'draft', // always create as draft first
    recipients: selectedRecipients,
    scheduledAt: actionType === 'scheduled' && scheduledAt.value
      ? scheduledAt.value.toISOString()
      : null
  }

  console.log('🔵 Preparing to create new message with payload:', payload)

  try {
    if (isEditMode.value) {
      await axios.put(`/api/messages/${messageId.value}`, payload)
      toast.success("Message updated successfully!")
      router.push('/admin/guests/messages')
    } else {
      const res = await axios.post('/api/messages', payload)
      const newMessageId = res?.data?.messageId
      console.log('🟢 Message created. New message ID:', newMessageId)

      if (actionType === 'sent' && newMessageId) {
        sendingState.value = 'sending'
        sendingStatusMessage.value = 'Saving your message...'
        messageId.value = newMessageId

        sendingStatusMessage.value = 'Preparing message for sending...'

        console.log('🟠 Starting to poll for readiness of message ID:', newMessageId)

        const startTime = Date.now()
        const pollInterval = 1000
        let ready = false

        while (Date.now() - startTime < 10000) { // 10 second timeout
          try {
            const statusRes = await axios.get(`/api/messages/${newMessageId}`)
            const msg = statusRes.data.message

            if (
              msg.subject &&
              msg.body_en &&
              Array.isArray(msg.recipients) &&
              msg.recipients.length > 0 &&
              (msg.status === 'draft' || msg.status === 'scheduled')
            ) {
              ready = true
              break
            }
          } catch (e) {
            console.warn('Polling error, retrying...', e)
          }

          await new Promise(r => setTimeout(r, pollInterval))
        }

        if (!ready) {
          sendingState.value = 'summary'
          sendingSummary.value.sentCount = 0
          sendingSummary.value.failedCount = 0
          sendingSummary.value.error = 'Sending cancelled — message not ready within 10 seconds.'
          return
        }

        sendingStatusMessage.value = 'Sending emails...'

        try {
          const sendRes = await axios.post(`/api/messages/${newMessageId}/send`)
          console.log('Send result:', sendRes.data)

          sendingSummary.value.sentCount = sendRes.data.sentCount || 0
          sendingSummary.value.failedCount = sendRes.data.failedCount || 0
          sendingState.value = 'summary'
        } catch (sendErr) {
          console.error('🔴 Sending failed with error:', sendErr)
          sendingSummary.value.sentCount = 0
          sendingSummary.value.failedCount = 0
          sendingSummary.value.error = 'Sending failed unexpectedly.'
          sendingState.value = 'summary'
        }
      } else {
        toast.success(`Message ${actionType} successfully!`)
        router.push('/admin/guests/messages')
      }
    }
  } catch (err) {
    console.error('🔴 Failed to save message:', err)
    toast.error('Failed to save message. Please try again.')
  }
}

const handleTemplateSaved = () => {
  toast.success('Template saved!')
}

const handleSummaryDismiss = () => {
  router.push(`/admin/guests/messages/${messageId.value}`)
}

onMounted(async () => {
  const id = route.params.id

  try {
    const templateRes = await axios.get('/api/templates')
    templates.value = templateRes.data.templates || []
  } catch (err) {
    toast.error('Failed to load templates.')
  }

  if (id) {
    isEditMode.value = true
    messageId.value = id

    try {
      const res = await axios.get(`/api/messages/${id}`)
      const msg = res.data.message

      await nextTick()

      if (composerRef.value?.setData) {
        composerRef.value.setData({
          subject: msg.subject,
          body_en: msg.body_en,
          body_lt: msg.body_lt
        })
      }

      if (recipientsRef.value?.setSelectedGuestIds) {
        recipientsRef.value.setSelectedGuestIds(msg.recipients || [])
      }

      if (msg.status === 'scheduled' && msg.scheduled_for) {
        const parsedDate = new Date(msg.scheduled_for)
        if (!isNaN(parsedDate)) {
          scheduledAt.value = new Date(parsedDate)
        }
      }
    } catch (err) {
      toast.error('Failed to load message for editing.')
    }
  }
})
</script>

<style scoped>
/* Optional scoped styles can be added here later */
</style>