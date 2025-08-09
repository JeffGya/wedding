<template>
  <Dialog 
    :visible="visible" 
    @update:visible="$emit('update:visible', $event)"
    :header="title"
    :style="{ width: '60rem' }"
    :modal="true"
    class="template-preview-dialog"
  >
    <div v-if="previewData.content" class="space-y-6">
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
            size="small"
            @click="loadPreview"
            :loading="loading"
          />
        </div>
        <small class="text-gray-500">
          Select a guest to see how the template will look with their specific data
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
            size="small"
            text
            @click="showDebug = !showDebug"
          />
        </div>
        
        <div v-if="showDebug" class="bg-gray-50 border rounded p-3 text-xs">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <h5 class="font-medium mb-2">Sample Guests</h5>
              <div class="space-y-1">
                <div v-for="guest in sampleGuests" :key="guest.id">
                  <strong>{{ guest.name }}</strong> ({{ guest.email }})
                </div>
              </div>
            </div>
            <div>
              <h5 class="font-medium mb-2">Template Style</h5>
              <div class="space-y-1">
                <div><strong>Style:</strong> {{ previewData.style }}</div>
                <div><strong>Subject:</strong> {{ previewData.subject }}</div>
                <div><strong>Content Length:</strong> {{ previewData.content?.length || 0 }} characters</div>
                <div><strong>Email HTML Length:</strong> {{ previewData.emailHtml?.length || 0 }} characters</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="flex justify-center items-center py-8">
      <ProgressSpinner />
    </div>

    <div v-else class="text-center py-8">
      <div class="text-gray-500">
        <i class="i-solar-exclamation-triangle-bold-duotone text-4xl mb-2"></i>
        <p>Failed to load preview</p>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-2">
        <Button 
          label="Use Template" 
          icon="i-solar-copy-bold-duotone" 
          @click="useTemplate"
          v-if="template"
        />
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
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { previewTemplate } from '@/api/templates';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  template: {
    type: Object,
    default: null
  },
  title: {
    type: String,
    default: 'Template Preview'
  }
})

const emit = defineEmits(['update:visible', 'use-template'])

const router = useRouter()
const toast = useToast()

const preview = ref(null)
const sampleGuests = ref([])
const selectedGuestId = ref(null)
const loading = ref(false)
const activeLanguageTab = ref(0)
const showDebug = ref(false)

const languageOptions = [
  { label: 'English', value: 0 },
  { label: 'Lithuanian', value: 1 }
]

const previewData = ref({
  subject: '',
  content: '',
  emailHtml: '',
  style: 'elegant'
})

watch(() => props.visible, (newVal) => {
  if (newVal && props.template) {
    loadPreview()
  }
})

async function loadPreview() {
  if (!props.template?.id) return
  
  try {
    loading.value = true
    const response = await previewTemplate(props.template.id, selectedGuestId.value)
    
    console.log('Preview response:', response);
    
    // Get the content based on the selected language
    const content = activeLanguageTab.value === 1 ? response.body_lt : response.body_en
    const emailHtml = activeLanguageTab.value === 1 ? response.email_html_lt : response.email_html_en
    
    previewData.value = {
      subject: response.subject,
      content: content,
      emailHtml: emailHtml, // Fixed: use the correct property name
      style: response.style || 'elegant'
    }
    
    // Update sample guests if provided
    if (response.sampleGuests) {
      sampleGuests.value = response.sampleGuests;
    }
  } catch (error) {
    console.error('Failed to preview template:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to preview template',
      life: 3000
    })
  } finally {
    loading.value = false
  }
}

function formatPreviewContent(content) {
  if (!content) return ''
  
  // Convert line breaks to HTML
  return content
    .replace(/\n/g, '<br>')
    .replace(/\r\n/g, '<br>')
}

function useTemplate() {
  emit('use-template', props.template)
  close()
}

function close() {
  emit('update:visible', false)
  preview.value = null
  selectedGuestId.value = null
}
</script>

<style scoped>
.template-preview-dialog {
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