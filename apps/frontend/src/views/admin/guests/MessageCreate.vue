<template>
  <AdminPageWrapper 
    :title="isEditMode ? 'Edit Message' : 'New Message'"
    description="Create and send messages to your wedding guests"
  >
    <template #headerActions>
      <Button 
        icon="pi pi-arrow-left" 
        severity="secondary" 
        text
        @click="$router.push('/admin/guests/messages')"
        v-tooltip.top="'Back to Messages'"
      />
    </template>

    <div class="grid gap-6 w-full box-border grid-cols-1 lg:grid-cols-3">
      <!-- Left (Message Composer & Schedule) -->
      <div class="lg:col-span-2 w-full">
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-edit text-acc-base"></i>
              <span>Message Composer</span>
            </div>
          </template>
          <template #content>
            <MessageComposer 
              ref="composerRef"
              :templates="templates"
            />
          </template>
        </Card>

        <!-- Schedule Section -->
        <Card class="mt-6">
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-calendar text-acc-base"></i>
              <span>Schedule</span>
            </div>
          </template>
          <template #content>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-2">Send Date & Time</label>
                <DatePicker
                  v-model="scheduledAt"
                  showTime
                  dateFormat="yy-mm-dd"
                  hourFormat="24"
                  class="w-full"
                  placeholder="Select date and time"
                  :minDate="new Date()"
                />
                <p class="text-sm text-gray-600 mt-1">
                  Leave empty to send immediately
                </p>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Right (Recipients) -->
      <div class="w-full">
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-users text-acc-base"></i>
              <span>Recipients</span>
            </div>
          </template>
          <template #content>
            <RecipientPicker ref="recipientsRef" />
          </template>
        </Card>
      </div>
    </div>

    <!-- Sticky Action Bar -->
    <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
      <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-2 text-sm text-gray-600">
          <span>{{ selectedRecipientsCount }} recipient(s) selected</span>
        </div>
        
        <div class="flex flex-wrap gap-2">
          <Button
            label="Save Draft"
            icon="i-solar:diskette-bold"
            severity="secondary"
            :loading="actionTypeBeingHandled === 'draft'"
            @click="handleComposerAction('draft')"
          />
          
          <Button
            label="Schedule"
            icon="pi pi-calendar"
            severity="info"
            :loading="actionTypeBeingHandled === 'scheduled'"
            @click="handleComposerAction('scheduled')"
          />
          
          <Button
            label="Save as Template"
            icon="pi pi-file-edit"
            severity="help"
            @click="isTemplateModalOpen = true"
          />
          
          <Button
            label="Send Now"
            icon="pi pi-send"
            severity="success"
            :loading="actionTypeBeingHandled === 'sent'"
            @click="handleComposerAction('sent')"
          />
        </div>
      </div>
    </div>

    <!-- Sending Progress Overlay -->
    <Dialog 
      v-model:visible="showSendingProgress" 
      modal 
      :closable="false"
      class="w-96"
    >
      <template #header>
        <h3 class="text-xl font-semibold">Sending Messages</h3>
      </template>
      
      <div class="space-y-6">
        <div class="text-center">
          <ProgressSpinner size="large" />
        </div>
        
        <div class="text-center">
          <p class="text-lg font-medium mb-2">{{ sendingStatusMessage }}</p>
          <p class="text-sm text-gray-600">
            Please wait while we send your message to all recipients...
          </p>
        </div>
        
        <div class="bg-gray-50 rounded-lg p-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium">Progress</span>
            <span class="text-sm text-gray-600">{{ sendingProgress.current }} / {{ sendingProgress.total }}</span>
          </div>
          <ProgressBar 
            :value="sendingProgress.percentage" 
            class="w-full"
          />
        </div>
      </div>
    </Dialog>

    <!-- Summary Modal -->
    <Dialog 
      v-model:visible="showSummaryModal" 
      modal 
      :closable="false"
      class="w-96"
    >
      <template #header>
        <h3 class="text-xl font-semibold">Sending Summary</h3>
      </template>
      
      <div class="space-y-4">
        <div v-if="sendingSummary.error" class="p-4 bg-red-50 rounded-lg">
          <div class="flex items-center gap-2">
            <i class="pi pi-exclamation-triangle text-red-600"></i>
            <span class="text-red-800 font-medium">Error</span>
          </div>
          <p class="text-red-700 mt-1">{{ sendingSummary.error }}</p>
        </div>
        
        <div class="p-4 bg-blue-50 rounded-lg">
          <div class="flex items-center gap-2 mb-2">
            <i class="pi pi-check-circle text-blue-600"></i>
            <span class="text-blue-800 font-medium">Results</span>
          </div>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span>Successfully sent:</span>
              <span class="font-medium text-green-600">{{ sendingSummary.sentCount }}</span>
            </div>
            <div class="flex justify-between">
              <span>Failed to send:</span>
              <span class="font-medium text-red-600">{{ sendingSummary.failedCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <Button 
          label="Done" 
          @click="handleSummaryDismiss"
          class="w-full"
        />
      </template>
    </Dialog>

    <!-- Template Modal -->
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
  </AdminPageWrapper>
</template>

<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createMessage, updateMessage, sendMessage, fetchMessage } from '@/api/messages'
import { fetchTemplates } from '@/api/templates'
import MessageComposer from '@/components/messaging/MessageComposer.vue'
import RecipientPicker from '@/components/messaging/RecipientPicker.vue'
import SaveTemplateModal from '@/components/messaging/SaveTemplateModal.vue'
import { useToastService } from '@/utils/toastService'
import { useErrorHandler } from '@/composables/useErrorHandler'

const route = useRoute()
const router = useRouter()
const { showSuccess, showWarning, showInfo } = useToastService()
const { handleError } = useErrorHandler({ showToast: true })

const composerRef = ref(null)
const recipientsRef = ref(null)
const scheduledAt = ref(null)
const actionTypeBeingHandled = ref(null)
const templates = ref([])
const isTemplateModalOpen = ref(false)

const sendingState = ref('idle') // idle | sending | summary
const sendingSummary = ref({ sentCount: 0, failedCount: 0 })
const sendingStatusMessage = ref('Preparing to send messages...')
const sendingProgress = ref({ current: 0, total: 0, percentage: 0 })

// Computed property for showing summary modal
const showSummaryModal = computed(() => sendingState.value === 'summary')

// Computed property for showing sending progress dialog
const showSendingProgress = computed(() => sendingState.value === 'sending')

// Computed property for selected recipients count
const selectedRecipientsCount = computed(() => {
  return recipientsRef.value?.getSelectedRecipients()?.length || 0
})

const isEditMode = computed(() => route.params.id && route.path.includes('/edit'))

const handleComposerAction = async (actionType) => {
  actionTypeBeingHandled.value = actionType
  
  try {
    const composerData = composerRef.value?.getData()
    if (!composerData) {
      handleError(new Error('Please fill in the message content'), 'Validation Error')
      return
    }

    const recipients = recipientsRef.value?.getSelectedRecipients() || []
    
    if (actionType === 'scheduled' && !scheduledAt.value) {
      handleError(new Error('Please select a schedule time'), 'Validation Error')
      return
    }

    // Always create as draft first, regardless of action type
    const messageData = {
      subject: composerData.subject,
      body_en: composerData.body_en,
      body_lt: composerData.body_lt,
      style: composerData.style, // ensure style is persisted with the message
      status: actionType === 'scheduled' ? 'scheduled' : 'draft',
      scheduledAt: actionType === 'scheduled' ? scheduledAt.value?.toISOString() : null,
      recipients: recipients
    }

    let messageId

    if (isEditMode.value) {
      // Update existing message
      const response = await updateMessage(route.params.id, messageData)
      messageId = route.params.id
      showSuccess('Success', 'Message updated successfully')
    } else {
      // Create new message
      const response = await createMessage(messageData)
      messageId = response.messageId
      showSuccess('Success', 'Message created successfully')
    }

    // Handle different action types
    if (actionType === 'sent') {
      // For "Send Now" - send the draft immediately
      await handleSendMessage(messageId)
    } else if (actionType === 'scheduled') {
      showSuccess('Scheduled', 'Message scheduled successfully')
      router.push('/admin/guests/messages')
    } else {
      // Draft - just redirect
      router.push('/admin/guests/messages')
    }
  } catch (error) {
    handleError(error, 'Failed to save message')
  } finally {
    actionTypeBeingHandled.value = null
  }
}

const handleSendMessage = async (messageId) => {
  sendingState.value = 'sending'
  sendingStatusMessage.value = 'Preparing to send messages...'
  
  // Initialize progress
  const recipients = recipientsRef.value?.getSelectedRecipients() || []
  sendingProgress.value = {
    current: 0,
    total: recipients.length,
    percentage: 0
  }
  
  try {
    // Simulate progress updates (since the backend doesn't provide real-time progress)
    const progressInterval = setInterval(() => {
      if (sendingProgress.value.current < sendingProgress.value.total) {
        sendingProgress.value.current += 1
        sendingProgress.value.percentage = Math.round((sendingProgress.value.current / sendingProgress.value.total) * 100)
        
        if (sendingProgress.value.current === 1) {
          sendingStatusMessage.value = 'Sending messages to recipients...'
        }
      }
    }, 500) // Update every 500ms
    
    const response = await sendMessage(messageId, recipients)
    
    // Clear the progress interval
    clearInterval(progressInterval)
    
    // Set final progress
    sendingProgress.value.current = sendingProgress.value.total
    sendingProgress.value.percentage = 100
    sendingStatusMessage.value = 'Sending complete!'
    
    // Wait a moment to show completion
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    sendingSummary.value = {
      sentCount: response.sentCount,
      failedCount: response.failedCount
    }
    
    // Show appropriate message based on results
    if (response.sentCount > 0 && response.failedCount === 0) {
      // All messages sent successfully
      showSuccess('Success', `Message sent to ${response.sentCount} recipients`)
      sendingState.value = 'summary'
    } else if (response.sentCount > 0 && response.failedCount > 0) {
      // Mixed results - some sent, some failed
      showWarning('Partial Success', `${response.sentCount} sent, ${response.failedCount} failed`, 5000)
      sendingState.value = 'summary'
    } else if (response.sentCount === 0 && response.failedCount > 0) {
      // All messages failed
      sendingSummary.value = {
        error: 'All messages failed to send. Please check your settings and try again.',
        sentCount: 0,
        failedCount: response.failedCount
      }
      sendingState.value = 'summary'
      handleError(new Error('All messages failed to send. Message remains as draft.'), 'Send Failed')
    } else {
      // No recipients or other edge case
      sendingSummary.value = {
        error: 'No messages were sent. Please check your settings and try again.',
        sentCount: 0,
        failedCount: response.failedCount
      }
      sendingState.value = 'summary'
      handleError(new Error('No messages were sent. Message remains as draft.'), 'Send Failed')
    }
  } catch (error) {
    sendingSummary.value = {
      error: error.response?.data?.error || 'Failed to send messages',
      sentCount: 0,
      failedCount: 0
    }
    sendingState.value = 'summary'
    
    // Show error toast - message remains as draft
    handleError(error, 'Failed to send messages. Message saved as draft.')
  }
}

const handleSummaryDismiss = () => {
  sendingState.value = 'idle'
  router.push('/admin/guests/messages')
}

const handleTemplateSaved = () => {
  isTemplateModalOpen.value = false
  showSuccess('Success', 'Template saved successfully')
  // Reload templates
  loadTemplates()
}

const loadTemplates = async () => {
  try {
    const response = await fetchTemplates()
    templates.value = response.templates || []
  } catch (error) {
    // Silently fail for templates - not critical
  }
}

const loadMessageForEdit = async () => {
  if (!isEditMode.value) return
  
  try {
    const response = await fetchMessage(route.params.id)
    const messageData = response.message
    
    // Set composer data
    nextTick(() => {
      if (composerRef.value) {
        composerRef.value.setData({
          subject: messageData.subject,
          body_en: messageData.body_en,
          body_lt: messageData.body_lt
        })
      }
      
      // Set recipients
      if (recipientsRef.value && messageData.recipients) {
        recipientsRef.value.setSelectedRecipients(messageData.recipients)
      }
      
      // Set scheduled time
      if (messageData.status === 'scheduled' && messageData.scheduled_for) {
        scheduledAt.value = new Date(messageData.scheduled_for)
      }
    })
  } catch (error) {
    handleError(error, 'Failed to load message for editing')
  }
}

onMounted(async () => {
  await loadTemplates()
  if (isEditMode.value) {
    await loadMessageForEdit()
  }
})
</script>

<style scoped>
/* Custom CSS to handle the bottom bar positioning */
@media (min-width: 768px) {
  .fixed.bottom-0 {
    left: 256px !important;
    right: 0 !important;
  }
}
</style>