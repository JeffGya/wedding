<template>
  <Dialog 
    :visible="visible" 
    @update:visible="$emit('update:visible', $event)"
    :header="title"
    :style="{ width: '60rem' }"
    :modal="true"
    class="message-preview-dialog"
  >
    <div v-if="message" class="space-y-6">
      <!-- Guest Selector -->
      <div class="guest-selector">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          Preview with Guest
        </label>
        <div class="flex gap-2">
          <Select
            v-model="selectedGuestId"
            :options="sampleGuests"
            optionLabel="name"
            optionValue="id"
            placeholder="Select a guest for preview"
            class="flex-1"
            @change="loadPreview"
          />
          <Button 
            label="Refresh" 
            icon="i-solar-refresh-bold-duotone" 
            size="normal"
            @click="loadPreview"
            :loading="loading"
          />
        </div>
        <small class="text-gray-500">
          Select a guest to see how the message will look with their specific data
        </small>
      </div>

      <!-- Language Tabs -->
      <div class="language-tabs">
        <div class="mb-4">
          <SelectButton
            v-model="activeLanguageTab"
            :options="languageOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
            @change="loadPreview"
          />
        </div>
      </div>

      <!-- Preview Content -->
      <div class="preview-content">
        <div class="mb-4">
          <h4 class="font-semibold text-sm text-gray-700 mb-2">Subject:</h4>
          <div class="bg-gray-50 p-3 rounded border text-sm">
            {{ previewData.subject || 'No subject' }}
          </div>
        </div>
        
        <div class="mb-4">
          <h4 class="font-semibold text-sm text-gray-700 mb-2">Email Preview:</h4>
          <div class="email-preview-container">
            <!-- Email Preview Frame -->
            <div class="email-preview-frame">
              <iframe
                v-if="previewData.emailHtml"
                :srcdoc="previewData.emailHtml"
                class="email-iframe"
                frameborder="0"
                scrolling="yes"
              ></iframe>
              <div v-else-if="loading" class="text-center py-8 text-gray-500">
                <i class="i-solar-refresh-bold-duotone animate-spin text-2xl mb-2"></i>
                <p>Loading preview...</p>
              </div>
              <div v-else class="text-center py-8 text-gray-500">
                <i class="i-solar-exclamation-triangle-bold-duotone text-2xl mb-2"></i>
                <p>No email HTML available for preview</p>
              </div>
            </div>
            <div class="mt-2 text-xs text-gray-500">
              Applied style: <code>template-{{ previewData.style || 'elegant' }}</code>
            </div>
          </div>
        </div>
      </div>

      <!-- Variables Debug Panel -->
      <div class="variables-debug">
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-semibold text-sm text-gray-700">Variables Used</h4>
          <Button 
            label="Toggle Debug" 
            icon="i-solar-code-bold-duotone" 
            size="normal"
            text
            @click="showDebug = !showDebug"
          />
        </div>
        
        <div v-if="showDebug" class="bg-gray-50 border rounded p-3 text-xs">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <strong>Guest Info:</strong>
              <ul class="mt-1 space-y-1">
                <li>Name: {{ selectedGuest?.name || 'N/A' }}</li>
                <li>Group: {{ selectedGuest?.group_label || 'N/A' }}</li>
                <li>Language: {{ selectedGuest?.preferred_language || 'N/A' }}</li>
                <li>RSVP Status: {{ selectedGuest?.rsvp_status || 'N/A' }}</li>
              </ul>
            </div>
            <div>
              <strong>Common Variables:</strong>
              <ul class="mt-1 space-y-1">
                <li>{{ guestName }} → {{ selectedGuest?.name || 'Guest' }}</li>
                <li>{{ groupLabel }} → {{ selectedGuest?.group_label || 'Guest' }}</li>
                <li>{{ rsvp_status }} → {{ selectedGuest?.rsvp_status || 'pending' }}</li>
                <li>{{ can_bring_plus_one }} → {{ selectedGuest?.can_bring_plus_one ? 'Yes' : 'No' }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <div class="text-gray-500">
        <i class="i-solar-exclamation-triangle-bold-duotone text-4xl mb-2"></i>
        <p>No message to preview</p>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <Button 
          label="Close" 
          icon="i-solar-close-circle-bold-duotone"
          severity="secondary"
          text
          @click="close"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { previewMessage } from '@/api/messages'
import { useToastService } from '@/utils/toastService'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  message: {
    type: Object,
    default: null
  },
  title: {
    type: String,
    default: 'Message Preview'
  }
})

const emit = defineEmits(['update:visible'])
const { showError } = useToastService()

const activeLanguageTab = ref(0)
const selectedGuestId = ref(null)
const loading = ref(false)
const showDebug = ref(false)
const sampleGuests = ref([])
const selectedGuest = ref(null)

const previewData = ref({
  subject: '',
  content: '',
  emailHtml: '',
  style: 'elegant'
})

const languageOptions = [
  { label: 'English', value: 0 },
  { label: 'Lithuanian', value: 1 }
]

// Watch for changes and load preview
watch(() => props.visible, (newVal) => {
  if (newVal && props.message) {
    // Load initial data first
    loadInitialData()
    // Then load preview
    loadPreview()
  }
})

// Load initial data (guests) without generating preview
async function loadInitialData() {
  try {
    const messageData = {
      subjectEn: props.message.subject_en || props.message.subject || '',
      subjectLt: props.message.subject_lt || props.message.subject || '',
      bodyEn: props.message.bodyEn || props.message.body_en || '',
      bodyLt: props.message.bodyLt || props.message.body_lt || '',
      style: props.message.style || 'elegant',
      guestId: null // Don't select any guest initially
    }
    
    const response = await previewMessage(messageData)
    
    // Update sample guests if provided
    if (response.sampleGuests && response.sampleGuests.length > 0) {
      sampleGuests.value = response.sampleGuests
    }
    
  } catch (error) {
    console.error('Failed to load initial data:', error)
  }
}

watch(() => activeLanguageTab.value, () => {
  if (props.message) {
    loadPreview()
  }
})

watch(() => selectedGuestId.value, () => {
  if (props.message) {
    loadPreview()
  }
})

async function loadPreview() {
  if (!props.message) return
  
  try {
    loading.value = true
    
    // Get content based on the selected language - handle both camelCase and snake_case
    const bodyEn = props.message.bodyEn || props.message.body_en || ''
    const bodyLt = props.message.bodyLt || props.message.body_lt || ''
    
    const messageData = {
      subjectEn: props.message.subject_en || props.message.subject || '',
      subjectLt: props.message.subject_lt || props.message.subject || '',
      bodyEn: bodyEn,
      bodyLt: bodyLt,
      style: props.message.style || 'elegant',
      guestId: selectedGuestId.value // Pass selected guest ID to backend
    }
    
    const response = await previewMessage(messageData)
    
    // Update sample guests if provided
    if (response.sampleGuests && response.sampleGuests.length > 0) {
      sampleGuests.value = response.sampleGuests
    }
    
    // Update selected guest
    if (response.selectedGuest) {
      selectedGuest.value = response.selectedGuest
    }
    
    // Get the content based on the selected language
    const content = activeLanguageTab.value === 1 ? response.body_lt : response.body_en
    const emailHtml = activeLanguageTab.value === 1 ? response.email_html_lt : response.email_html_en
    const subject = activeLanguageTab.value === 1 ? (response.subject_lt || response.subject) : (response.subject_en || response.subject)
    
    previewData.value = {
      subject: subject,
      content: content,
      emailHtml: emailHtml,
      style: response.style || 'elegant'
    }
    
  } catch (error) {
    console.error('Failed to preview message:', error)
    showError('Error', 'Failed to preview message')
  } finally {
    loading.value = false
  }
}

function close() {
  emit('update:visible', false)
  previewData.value = {
    subject: '',
    content: '',
    emailHtml: '',
    style: 'elegant'
  }
  selectedGuestId.value = null
  selectedGuest.value = null
  sampleGuests.value = []
}
</script>

<style scoped>
.message-preview-dialog {
  max-width: 80vw;
}

.email-preview-container {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.email-preview-frame {
  background: #f9fafb;
  min-height: 400px;
  max-height: 600px;
  position: relative;
}

.email-iframe {
  width: 100%;
  height: 500px;
  border: none;
  background: white;
  overflow-y: auto;
}

.variables-debug {
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
}
</style>

