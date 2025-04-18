<template>
  <div class="p-6">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">New Message</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Composer Section -->
      <div>
        <h2 class="text-xl font-semibold text-gray-700 mb-2">Message Composer</h2>
        <!-- Will mount MessageComposer.vue here -->
        <MessageComposer
          ref="composerRef"
          @save="() => handleComposerAction('draft')"
          @schedule="() => handleComposerAction('scheduled')"
          @send-now="() => handleComposerAction('sent')"
        />
        <div v-if="actionTypeBeingHandled === 'scheduled'" class="mt-4">
          <label for="schedule-time" class="block text-sm font-medium text-gray-700 mb-1">Schedule time</label>
          <DatePicker
            v-model="scheduledAt"
            type="datetime"
            format="YYYY-MM-DD HH:mm"
            placeholder="Select date and time"
            class="w-full"
            @change="onDateChange"
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import MessageComposer from '@/components/messaging/MessageComposer.vue'
import RecipientPicker from '@/components/messaging/RecipientPicker.vue'
import { useToast } from 'vue-toastification'
import DatePicker from 'vue-datepicker-next';
import 'vue-datepicker-next/index.css';

const router = useRouter()
const toast = useToast()

const composerRef = ref(null)
const recipientsRef = ref(null)
const scheduledAt = ref(null)
const actionTypeBeingHandled = ref(null)

const onDateChange = (value) => {
  scheduledAt.value = value
  console.log('📅 New scheduled date:', scheduledAt.value)
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
    scheduledAt: actionType === 'scheduled' ? scheduledAt.value : null
  }

  try {
    await axios.post('/api/messages', payload)
    toast.success(`Message ${actionType === 'sent' ? 'sent' : actionType} successfully!`)
    router.push('/admin/guests/messages')
  } catch (err) {
    console.error('❌ Failed to save message:', err)
    toast.error('Failed to save message. Please try again.')
  }
}
</script>

<style scoped>
/* Optional scoped styles can be added here later */
</style>