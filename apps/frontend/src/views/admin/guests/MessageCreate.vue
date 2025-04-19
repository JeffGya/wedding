<template>
  <div class="p-6">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">{{ isEditMode ? 'Edit Message' : 'New Message' }}</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Composer Section -->
      <div>
        <h2 class="text-xl font-semibold text-gray-700 mb-2">Message Composer</h2>
        <!-- Will mount MessageComposer.vue here -->
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
            class="w-full"
          />
        </div>
      </div>

      <!-- Recipient Picker Section -->
      <div>
        <h2 class="text-xl font-semibold text-gray-700 mb-2">Recipients</h2>
        <!-- Will mount RecipientPicker.vue here -->
        <RecipientPicker ref="recipientsRef" />
      </div>
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

const router = useRouter()
const toast = useToast()

const composerRef = ref(null)
const recipientsRef = ref(null)
const scheduledAt = ref(null)
const actionTypeBeingHandled = ref(null)
const templates = ref([])

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
  console.log('📅 Updated scheduledAt value:', scheduledAt.value)
}

const onManualDateInput = (event) => {
  const input = event.target?.value
  if (!input) return

  const parsed = new Date(input)
  if (!isNaN(parsed)) {
    scheduledAt.value = parsed
    console.log('📝 Manual input set scheduledAt to:', parsed)
  } else {
    console.warn('❌ Invalid manual input for date:', input)
    toast.error('Invalid date format. Use yyyy-MM-dd HH:mm')
  }
}

const handleComposerAction = async (actionType) => {
  actionTypeBeingHandled.value = actionType
  const composerData = composerRef.value?.getData()
  const selectedRecipients = recipientsRef.value?.getSelectedGuestIds()

  console.log('🧪 Composer Data:', composerData)
  console.log('🧪 Selected Recipients:', selectedRecipients)
  console.log('🧪 Is subject valid?', !!composerData?.subject)
  console.log('🧪 Is body_en valid?', !!composerData?.body_en)
  console.log('🧪 Are recipients valid?', selectedRecipients?.length > 0)

  if (!composerData?.subject || !composerData?.body_en || !selectedRecipients?.length) {
    toast.error('Please fill out the message and select at least one recipient.')
    return
  }

  if (actionType === 'scheduled') {
    if (!scheduledAt.value) {
      // Don’t return yet — let the UI show the picker first
      return
    }
  }

  if (actionType === 'scheduled' && !scheduledAt.value) {
    toast.error('Please select a date and time before scheduling.')
    return
  }

  const payload = {
    subject: composerData.subject,
    body_en: composerData.body_en,
    body_lt: composerData.body_lt,
    status: actionType, // 'draft', 'scheduled', or 'sent'
    recipients: selectedRecipients,
    scheduledAt: actionType === 'scheduled' && scheduledAt.value
      ? scheduledAt.value.toISOString()
      : null
  }

  try {
    console.log('📦 Final payload being sent:', JSON.stringify(payload, null, 2))
    if (isEditMode.value) {
      await axios.put(`/api/messages/${messageId.value}`, payload)
      toast.success("Message updated successfully!")
    } else {
      await axios.post('/api/messages', payload)
      toast.success(`Message ${actionType === 'sent' ? 'sent' : actionType} successfully!`)
    }
    router.push('/admin/guests/messages')
  } catch (err) {
    console.error('❌ Failed to save message:', err)
    toast.error('Failed to save message. Please try again.')
  }
}

onMounted(async () => {
  const id = route.params.id
  console.log('🧭 Checking for edit mode. Route ID:', id)

  try {
    const templateRes = await axios.get('/api/templates')
    templates.value = templateRes.data.templates || []
    console.log('📋 Loaded templates:', templates.value)
  } catch (err) {
    console.error('❌ Failed to load templates:', err)
    toast.error('Failed to load templates.')
  }

  if (id) {
    isEditMode.value = true
    messageId.value = id

    try {
      const res = await axios.get(`/api/messages/${id}`)
      const msg = res.data.message
      console.log('📩 Loaded message for editing:', msg)

      await nextTick()

      if (composerRef.value?.setData) {
        console.log('✅ Calling setData on composerRef with:', {
          subject: msg.subject,
          body_en: msg.body_en,
          body_lt: msg.body_lt
        })
        composerRef.value.setData({
          subject: msg.subject,
          body_en: msg.body_en,
          body_lt: msg.body_lt
        })
      } else {
        console.warn("❗ composerRef.value.setData is not defined or not a function.", composerRef.value)
      }

      if (recipientsRef.value?.setSelectedGuestIds) {
        console.log('✅ Setting selected guest IDs:', msg.recipients || [])
        recipientsRef.value.setSelectedGuestIds(msg.recipients || [])
      } else {
        console.warn("❗ recipientsRef.value.setSelectedGuestIds is not defined or not a function.", recipientsRef.value)
      }

      if (msg.status === 'scheduled' && msg.scheduled_for) {
        const parsedDate = new Date(msg.scheduled_for)
        if (!isNaN(parsedDate)) {
          scheduledAt.value = new Date(parsedDate)
          console.log('⏰ Scheduled time loaded:', scheduledAt.value)
        }
      }
    } catch (err) {
      console.error('❌ Failed to load message for editing:', err)
      toast.error('Failed to load message for editing.')
    }
  }
})
</script>

<style scoped>
/* Optional scoped styles can be added here later */
</style>