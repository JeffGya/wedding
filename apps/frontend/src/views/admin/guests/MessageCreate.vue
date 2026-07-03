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

    <!-- Step indicator -->
    <div class="flex items-center gap-2 mb-6 flex-wrap">
      <template v-for="(label, i) in stepLabels" :key="label">
        <button
          type="button"
          class="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0"
          :class="{ 'opacity-60': i > currentStep }"
          :disabled="i > currentStep"
          @click="goToStep(i)"
        >
          <span
            class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            :style="i === currentStep
              ? { background: 'var(--int-base)', color: 'var(--acc2-base)' }
              : { background: 'var(--card-bg)', color: 'var(--int-base)', border: '1px solid var(--form-border)' }"
          >{{ i + 1 }}</span>
          <span class="text-sm font-semibold text-txt">{{ label }}</span>
        </button>
        <span v-if="i < stepLabels.length - 1" class="w-8 h-px bg-form-border"></span>
      </template>
    </div>

    <!-- Step 1: Write (kept mounted via v-show so editor state survives step changes) -->
    <div v-show="currentStep === 0">
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-pencil text-acc-base"></i>
            <span>Write your message</span>
          </div>
        </template>
        <template #content>
          <FieldError :message="stepError" class="mb-4" />
          <MessageComposer
            ref="composerRef"
            :templates="templates"
          />
        </template>
      </Card>
    </div>

    <!-- Step 2: Recipients -->
    <div v-show="currentStep === 1">
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-users text-acc-base"></i>
            <span>Choose recipients</span>
          </div>
        </template>
        <template #content>
          <RecipientPicker ref="recipientsRef" />
        </template>
      </Card>
    </div>

    <!-- Step 3: Review & send -->
    <div v-show="currentStep === 2">
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-send text-acc-base"></i>
            <span>Review &amp; send</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-6">
            <!-- Subject -->
            <div>
              <div class="text-sm font-bold text-txt mb-1">Subject</div>
              <p class="text-sm text-txt m-0">EN: {{ reviewData.subject_en || '—' }}</p>
              <p class="text-sm text-txt m-0">LT: {{ reviewData.subject_lt || '—' }}</p>
            </div>

            <!-- Message preview -->
            <div>
              <div class="text-sm font-bold text-txt mb-1">Message preview (English)</div>
              <div
                class="bg-form-bg border border-form-border rounded-lg p-16 max-h-64 overflow-y-auto text-sm"
                v-html="reviewData.body_en || '<em>No message content yet.</em>'"
              ></div>
            </div>

            <!-- Recipients -->
            <div>
              <div class="text-sm font-bold text-txt mb-1">
                Recipients — {{ selectedRecipientsCount }}
              </div>
              <p v-if="selectedRecipientsCount === 0" class="text-sm text-[#7A6B55] m-0">
                No recipients selected. Go back to the Recipients step to choose who receives this message.
              </p>
              <ul v-else class="bg-form-bg border border-form-border rounded-lg p-16 max-h-48 overflow-y-auto space-y-1 m-0 list-none">
                <li v-for="guest in selectedGuestObjects" :key="guest.id" class="text-sm text-txt">
                  {{ guest.name }}
                </li>
              </ul>
            </div>

            <!-- Schedule -->
            <div>
              <div class="text-sm font-bold text-txt mb-1">Schedule (optional)</div>
              <DatePicker
                v-model="scheduledAt"
                showTime
                dateFormat="yy-mm-dd"
                hourFormat="24"
                class="w-full"
                placeholder="Select date and time"
                :minDate="new Date()"
              />
              <p class="text-sm text-[#7A6B55] mt-1">
                Set a date and use the Schedule button, or leave empty and use Send Now.
              </p>
            </div>

            <!-- Real-send warning -->
            <div
              v-if="selectedRecipientsCount > 0"
              class="p-16 rounded-lg border"
              style="background: #FCEFC7; border-color: #E3B13F;"
            >
              <p class="text-sm font-semibold m-0" style="color: #8A6A00;">
                This sends real email. "Send Now" delivers this message to
                {{ selectedRecipientsCount }} guest(s) immediately.
              </p>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Sticky Action Bar -->
    <div class="fixed bottom-0 left-0 right-0 bg-card-bg border-t border-form-border p-4 shadow-lg z-50">
      <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-2 text-sm text-[#7A6B55]">
          <span>{{ selectedRecipientsCount }} recipient(s) selected</span>
        </div>

        <div class="flex flex-wrap gap-2">
          <Button
            v-if="currentStep > 0"
            label="Back"
            icon="pi pi-arrow-left"
            severity="secondary"
            outlined
            @click="currentStep--"
          />

          <Button
            v-if="currentStep < 2"
            label="Next"
            icon="pi pi-arrow-right"
            iconPos="right"
            @click="nextStep"
          />

          <template v-if="currentStep === 2">
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
              :label="`Send to ${selectedRecipientsCount} guest(s)`"
              icon="pi pi-send"
              severity="success"
              :disabled="selectedRecipientsCount === 0"
              :loading="actionTypeBeingHandled === 'sent'"
              @click="handleComposerAction('sent')"
            />
          </template>
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
          <p class="text-sm text-[#7A6B55]">
            Please wait while we send your message to all recipients...
          </p>
        </div>

        <div class="bg-form-bg border border-form-border rounded-lg p-4">
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium">Progress</span>
            <span class="text-sm text-[#7A6B55]">{{ sendingProgress.current }} / {{ sendingProgress.total }}</span>
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
        <div v-if="sendingSummary.error" class="p-4 rounded-lg" style="background: #F3D9D6;">
          <div class="flex items-center gap-2">
            <i class="pi pi-exclamation-triangle" style="color: #B3453B;"></i>
            <span class="font-medium" style="color: #B3453B;">Error</span>
          </div>
          <p class="mt-1" style="color: #B3453B;">{{ sendingSummary.error }}</p>
        </div>

        <div class="p-4 bg-form-bg border border-form-border rounded-lg">
          <div class="flex items-center gap-2 mb-2">
            <i class="pi pi-check-circle text-int-base"></i>
            <span class="text-txt font-medium">Results</span>
          </div>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span>Successfully sent:</span>
              <span class="font-medium" style="color: #2E7D46;">{{ sendingSummary.sentCount }}</span>
            </div>
            <div class="flex justify-between">
              <span>Failed to send:</span>
              <span class="font-medium" style="color: #B3453B;">{{ sendingSummary.failedCount }}</span>
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
      :subjectEn="composerRef?.getData()?.subject_en || ''"
      :subjectLt="composerRef?.getData()?.subject_lt || ''"
      :bodyEn="composerRef?.getData()?.body_en || ''"
      :bodyLt="composerRef?.getData()?.body_lt || ''"
      :templates="templates"
      @close="isTemplateModalOpen = false"
      @saved="handleTemplateSaved"
    />

    <!-- Unsaved-changes leave confirmation -->
    <LeaveConfirmModal
      :visible="!!pendingNavigation"
      @update:visible="(val) => { if (!val && pendingNavigation) resolveNavigation('stay') }"
      @stay="() => resolveNavigation('stay')"
      @discard="() => resolveNavigation('discard')"
      @save="onSaveAndLeave"
    />
  </AdminPageWrapper>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createMessage, updateMessage, sendMessage, fetchMessage } from '@/api/messages'
import { fetchTemplates } from '@/api/templates'
import MessageComposer from '@/components/messaging/MessageComposer.vue'
import RecipientPicker from '@/components/messaging/RecipientPicker.vue'
import SaveTemplateModal from '@/components/messaging/SaveTemplateModal.vue'
import LeaveConfirmModal from '@/components/ui/LeaveConfirmModal.vue'
import FieldError from '@/components/ui/FieldError.vue'
import { useToastService } from '@/utils/toastService'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'

const route = useRoute()
const router = useRouter()
const { showSuccess, showWarning, showInfo } = useToastService()
const { handleError } = useErrorHandler({ showToast: true })
const { markDirty, markClean, pendingNavigation, resolveNavigation } = useUnsavedChanges()

const composerRef = ref(null)
const recipientsRef = ref(null)
const scheduledAt = ref(null)
const actionTypeBeingHandled = ref(null)
const templates = ref([])
const isTemplateModalOpen = ref(false)

// Wizard steps
const stepLabels = ['Write', 'Recipients', 'Review & send']
const currentStep = ref(0)
const stepError = ref('')

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

// Selected guests as objects (for the review step's name list)
const selectedGuestObjects = computed(() => {
  return recipientsRef.value?.getSelectedGuestObjects() || []
})

// Live composer data for the review step
const reviewData = computed(() => {
  return composerRef.value?.getData() || {}
})

const isEditMode = computed(() => route.params.id && route.path.includes('/edit'))

// Sync the composer's dirty state into the unsaved-changes guard
watch(() => composerRef.value?.isDirty, (dirty) => {
  if (dirty) {
    markDirty()
  } else {
    markClean()
  }
})

const goToStep = (i) => {
  if (i <= currentStep.value) {
    currentStep.value = i
  }
}

const nextStep = () => {
  if (currentStep.value === 0) {
    const data = composerRef.value?.getData()
    if (!data?.subject_en?.trim()) {
      stepError.value = 'Subject (English) is required before continuing.'
      return
    }
    stepError.value = ''
  }
  if (currentStep.value < 2) {
    currentStep.value++
  }
}

// Persist the message (create or update) without navigating. Returns the
// message id. Used by the action buttons and by "Save & leave".
const persistMessage = async (actionType) => {
  const composerData = composerRef.value?.getData()
  if (!composerData) {
    throw new Error('Please fill in the message content')
  }

  const recipients = recipientsRef.value?.getSelectedRecipients() || []

  // Always create as draft first, regardless of action type
  const messageData = {
    subject_en: composerData.subject_en,
    subject_lt: composerData.subject_lt,
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
    await updateMessage(route.params.id, messageData)
    messageId = route.params.id
    showSuccess('Success', 'Message updated successfully')
  } else {
    // Create new message
    const response = await createMessage(messageData)
    messageId = response.messageId
    showSuccess('Success', 'Message created successfully')
  }

  // Saved — clear the unsaved-changes guard
  composerRef.value?.markClean()
  markClean()

  return messageId
}

const handleComposerAction = async (actionType) => {
  actionTypeBeingHandled.value = actionType

  try {
    if (actionType === 'scheduled' && !scheduledAt.value) {
      handleError(new Error('Please select a schedule time'), 'Validation Error')
      return
    }

    const messageId = await persistMessage(actionType)

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

const onSaveAndLeave = async () => {
  try {
    await persistMessage('draft')
    resolveNavigation('discard')
  } catch (error) {
    handleError(error, 'Failed to save draft')
    resolveNavigation('stay')
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
  markClean()
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

    // Set composer data - use subject_en and subject_lt from normalized message
    nextTick(() => {
      if (composerRef.value) {
        composerRef.value.setData({
          subject_en: messageData.subject_en,
          subject_lt: messageData.subject_lt,
          subject: messageData.subject, // Fallback for backward compatibility
          body_en: messageData.body_en,
          body_lt: messageData.body_lt,
          style: messageData.style || 'elegant'
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
