<template>
  <AdminPageWrapper 
    :title="isEditMode ? 'Edit Template' : 'New Template'"
    description="Create and edit email templates for your guest communications"
  >
    <template #headerActions>
      <Button 
        icon="i-solar-arrow-left-bold-duotone" 
        severity="secondary" 
        text
        @click="$router.push('/admin/templates')"
        v-tooltip.top="'Back to Templates'"
      />
    </template>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:grid-rows-1 min-h-0">
      <!-- Main Form -->
      <div class="lg:col-span-2 flex flex-col min-h-0">
        <Card class="flex-1">
          <template #content>
            <form @submit.prevent="saveTemplate" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <FloatLabel variant="in">
                    <InputText
                      id="template_name"
                      v-model="form.name"
                      class="w-full"
                      placeholder="Enter template name"
                      required
                    />
                    <label for="template_name">Template Name</label>
                  </FloatLabel>
                </div>
                
                <div>
                  <FloatLabel variant="in">
                    <Select
                      id="template_style"
                      v-model="form.style"
                      :options="styleOptions"
                      option-label="name"
                      option-value="key"
                      class="w-full"
                      placeholder="Select a style"
                    />
                    <label for="template_style">Style</label>
                  </FloatLabel>
                </div>
              </div>

              <!-- Subject Fields -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <FloatLabel variant="in">
                    <InputText
                      id="template_subject_en"
                      v-model="form.subject_en"
                      class="w-full"
                      placeholder="Enter email subject (English)"
                      required
                    />
                    <label for="template_subject_en">Subject (English)</label>
                  </FloatLabel>
                </div>
                
                <div>
                  <FloatLabel variant="in">
                    <InputText
                      id="template_subject_lt"
                      v-model="form.subject_lt"
                      class="w-full"
                      placeholder="Enter email subject (Lithuanian)"
                      required
                    />
                    <label for="template_subject_lt">Subject (Lithuanian)</label>
                  </FloatLabel>
                </div>
              </div>

              <!-- Language Tabs -->
              <div>
                <div class="mb-4">
                  <SelectButton
                    v-model="activeTab"
                    :options="languageOptions"
                    option-label="label"
                    option-value="value"
                    class="w-full"
                  />
                </div>

                <!-- English Content -->
                <div v-if="activeTab === 'en'">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    English Content
                  </label>
                  <RichTextEditor
                    v-model="form.body_en"
                    :context="'email'"
                    placeholder="Enter English content..."
                  />
                </div>

                <!-- Lithuanian Content -->
                <div v-if="activeTab === 'lt'">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Lithuanian Content
                  </label>
                  <RichTextEditor
                    v-model="form.body_lt"
                    :context="'email'"
                    placeholder="Enter Lithuanian content..."
                  />
                </div>
              </div>

              <!-- Save Button -->
              <div class="flex justify-end space-x-4">
                <Button
                  type="button"
                  severity="secondary"
                  @click="$router.push('/admin/templates')"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  :loading="saving"
                  :disabled="!form.name || !form.subject_en || !form.subject_lt || !form.body_en || !form.body_lt"
                >
                  {{ isEditMode ? 'Update Template' : 'Create Template' }}
                </Button>
              </div>
            </form>
          </template>
        </Card>
      </div>

      <!-- Right Column: Preview Panel -->
      <div class="lg:col-span-2 flex flex-col min-h-0">
        <TemplatePreviewPanel
          :preview-data="previewData"
          :loading="previewLoading"
          :error="previewError"
          @guest-selected="handleGuestSelected"
          @language-changed="handleLanguageChanged"
        />
      </div>
    </div>

    <!-- Template Variables Cheatsheet -->
    <div class="mt-6">
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <i class="i-solar:document-text-bold-duotone text-acc-base"></i>
              <span>Template Variables Cheatsheet</span>
            </div>
            <Button
              :icon="cheatsheetExpanded ? 'i-solar:alt-arrow-up-bold-duotone' : 'i-solar:alt-arrow-down-bold-duotone'"
              severity="secondary"
              text
              @click="cheatsheetExpanded = !cheatsheetExpanded"
              v-tooltip.top="cheatsheetExpanded ? 'Collapse' : 'Expand'"
            />
          </div>
        </template>
        <template #content>
          <div v-if="variablesLoading" class="flex justify-center items-center py-8">
            <ProgressSpinner />
          </div>
          <div v-else-if="variablesError" class="text-center py-8 text-red-500">
            <i class="i-solar:exclamation-triangle-bold-duotone text-2xl mb-2"></i>
            <p>{{ variablesError }}</p>
          </div>
          <div v-else-if="templateVariables && cheatsheetExpanded" class="space-y-6">
            <!-- Guest Properties -->
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-3">Guest Properties</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="(description, varName) in guestProperties" :key="varName" class="border rounded-lg p-3 bg-gray-50">
                  <code class="text-sm font-mono text-acc-base block mb-1">{{ formatVariableName(varName) }}</code>
                  <p class="text-sm text-gray-600">{{ description }}</p>
                </div>
              </div>
            </div>

            <!-- Conditional Flags -->
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-3">Conditional Flags</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="(description, varName) in conditionalFlags" :key="varName" class="border rounded-lg p-3 bg-gray-50">
                  <code class="text-sm font-mono text-acc-base block mb-1">{{ formatVariableName(varName) }}</code>
                  <p class="text-sm text-gray-600">{{ description }}</p>
                </div>
              </div>
            </div>

            <!-- System Properties -->
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-3">System Properties</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="(description, varName) in systemProperties" :key="varName" class="border rounded-lg p-3 bg-gray-50">
                  <code class="text-sm font-mono text-acc-base block mb-1">{{ formatVariableName(varName) }}</code>
                  <p class="text-sm text-gray-600">{{ description }}</p>
                </div>
              </div>
            </div>

            <!-- Conditional Examples -->
            <div v-if="conditionalExamples && Object.keys(conditionalExamples).length > 0">
              <h3 class="text-lg font-semibold text-gray-800 mb-3">Conditional Examples</h3>
              <div class="space-y-3">
                <div v-for="(description, example) in conditionalExamples" :key="example" class="border rounded-lg p-3 bg-blue-50">
                  <code class="text-sm font-mono text-acc-base block mb-1">{{ example }}</code>
                  <p class="text-sm text-gray-600">{{ description }}</p>
                </div>
              </div>
            </div>
          </div>
          <div v-else-if="templateVariables && !cheatsheetExpanded" class="text-center py-4 text-gray-500">
            <p>Click expand to view available template variables</p>
          </div>
        </template>
      </Card>
    </div>
  </AdminPageWrapper>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createTemplate, updateTemplate, fetchTemplate, previewTemplateData, getTemplateStyles, getTemplateVariables } from '@/api/templates'
import RichTextEditor from '@/components/forms/RichTextEditor.vue'
import TemplatePreviewPanel from '@/components/templates/TemplatePreviewPanel.vue'
import { useToastService } from '@/utils/toastService'
import { useErrorHandler } from '@/composables/useErrorHandler'
import ProgressSpinner from 'primevue/progressspinner'

const route = useRoute()
const router = useRouter()
const { showSuccess } = useToastService()
const { handleError } = useErrorHandler({ showToast: true })

const isEditMode = computed(() => route.params.id !== undefined)
const saving = ref(false)
const activeTab = ref('en')
const availableStyles = ref([]);

const styleOptions = ref([])

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Lithuanian', value: 'lt' }
]

const form = ref({
  name: '',
  subject_en: '',
  subject_lt: '',
  body_en: '',
  body_lt: '',
  style: 'elegant'
})

// Preview state
const previewData = ref(null)
const previewLoading = ref(false)
const previewError = ref(null)
const selectedGuestId = ref(null)
const previewDebounceTimer = ref(null)

// Template variables cheatsheet state
const templateVariables = ref(null)
const conditionalExamples = ref(null)
const variablesLoading = ref(false)
const variablesError = ref(null)
const cheatsheetExpanded = ref(false)

async function loadTemplate() {
  if (!isEditMode.value) return
  
  try {
    const response = await fetchTemplate(route.params.id)
    const template = response.template // Access the template from the response
    
    form.value = {
      name: template.name,
      subject_en: template.subject_en || template.subject || '',
      subject_lt: template.subject_lt || template.subject || '',
      body_en: template.body_en,
      body_lt: template.body_lt,
      style: template.style || 'elegant'
    }
  } catch (error) {
    handleError(error, 'Failed to load template')
  }
}

async function saveTemplate() {
  saving.value = true
  
  try {
    const templateData = {
      name: form.value.name,
      subject_en: form.value.subject_en,
      subject_lt: form.value.subject_lt,
      body_en: form.value.body_en,
      body_lt: form.value.body_lt,
      style: form.value.style
    }
    
    if (isEditMode.value) {
      await updateTemplate(route.params.id, templateData)
      showSuccess('Success', 'Template updated successfully')
    } else {
      await createTemplate(templateData)
      showSuccess('Success', 'Template created successfully')
    }
    
    router.push('/admin/templates')
  } catch (error) {
    handleError(error, 'Failed to save template')
  } finally {
    saving.value = false
  }
}

// Debounced preview update function
function updatePreview() {
  // Clear existing timer
  if (previewDebounceTimer.value) {
    clearTimeout(previewDebounceTimer.value)
  }
  
  // Set new timer (2 seconds delay)
  previewDebounceTimer.value = setTimeout(async () => {
    if (!form.value.name || !form.value.subject_en || !form.value.subject_lt || !form.value.body_en || !form.value.body_lt) {
      previewData.value = null
      return
    }
    
    try {
      previewLoading.value = true
      previewError.value = null
      
      const response = await previewTemplateData({
        name: form.value.name,
        subject_en: form.value.subject_en,
        subject_lt: form.value.subject_lt,
        body_en: form.value.body_en,
        body_lt: form.value.body_lt,
        style: form.value.style
      }, selectedGuestId.value)
      
      previewData.value = response
    } catch (error) {
      previewError.value = error.message || 'Failed to generate preview'
      console.error('Preview error:', error)
    } finally {
      previewLoading.value = false
    }
  }, 2000) // 2 second debounce
}

// Watch form fields for changes
watch([
  () => form.value.body_en,
  () => form.value.body_lt,
  () => form.value.subject_en,
  () => form.value.subject_lt,
  () => form.value.style
], (newValues, oldValues) => {
  updatePreview()
}, { deep: true })

// Handle guest selection from preview panel
function handleGuestSelected(guestId) {
  selectedGuestId.value = guestId
  updatePreview()
}

// Handle language change from preview panel
function handleLanguageChanged(language) {
  // Language change is handled by the preview panel component
  // This is just for future extensibility if needed
}

// Format variable name for display in cheatsheet
function formatVariableName(varName) {
  return `{{${varName}}}`
}

// Load template variables for cheatsheet
async function loadTemplateVariables() {
  variablesLoading.value = true
  variablesError.value = null
  
  try {
    const response = await getTemplateVariables()
    templateVariables.value = response.variables || {}
    conditionalExamples.value = response.conditionalExamples || {}
  } catch (error) {
    variablesError.value = error.message || 'Failed to load template variables'
    handleError(error, 'Failed to load template variables')
  } finally {
    variablesLoading.value = false
  }
}

// Computed properties to organize variables by category
const guestProperties = computed(() => {
  if (!templateVariables.value) return {}
  const guestProps = [
    'guestName', 'name', 'groupLabel', 'code', 'rsvpCode', 'rsvpLink',
    'plusOneName', 'plus_one_name', 'rsvpDeadline', 'email', 'preferredLanguage',
    'attending', 'rsvp_status', 'responded_at', 'can_bring_plus_one',
    'dietary', 'notes'
  ]
  const result = {}
  guestProps.forEach(prop => {
    if (templateVariables.value[prop]) {
      result[prop] = templateVariables.value[prop]
    }
  })
  return result
})

const conditionalFlags = computed(() => {
  if (!templateVariables.value) return {}
  const flags = [
    'hasPlusOne', 'has_plus_one', 'isPlusOne', 'hasResponded',
    'isAttending', 'isNotAttending', 'isPending', 'isBrideFamily',
    'isGroomFamily', 'isEnglishSpeaker', 'isLithuanianSpeaker'
  ]
  const result = {}
  flags.forEach(flag => {
    if (templateVariables.value[flag]) {
      result[flag] = templateVariables.value[flag]
    }
  })
  return result
})

const systemProperties = computed(() => {
  if (!templateVariables.value) return {}
  const systemProps = [
    'siteUrl', 'websiteUrl', 'weddingDate', 'venueName', 'venueAddress',
    'eventStartDate', 'eventEndDate', 'eventTime', 'brideName', 'groomName',
    'contactEmail', 'contactPhone', 'rsvpDeadlineDate', 'eventType', 'dressCode',
    'specialInstructions', 'appTitle', 'senderName', 'senderEmail',
    'currentDate', 'daysUntilWedding'
  ]
  const result = {}
  systemProps.forEach(prop => {
    if (templateVariables.value[prop]) {
      result[prop] = templateVariables.value[prop]
    }
  })
  return result
})

onMounted(async () => {
  try {
    // Load template styles first
    const response = await getTemplateStyles();
    availableStyles.value = response.styles;
    styleOptions.value = response.styles; // Initialize styleOptions
    
    // Load template data if in edit mode
    if (isEditMode.value) {
      await loadTemplate();
    }
    
    // Load template variables for cheatsheet
    await loadTemplateVariables()
    
    // Initial preview after form is loaded
    updatePreview()
  } catch (error) {
    handleError(error, 'Failed to load template styles');
  }
});
</script>