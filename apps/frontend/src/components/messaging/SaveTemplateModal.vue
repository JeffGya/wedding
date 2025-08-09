<template>
  <Dialog 
    v-model:visible="isVisible" 
    modal 
    class="w-96"
    :closable="false"
  >
    <template #header>
      <h3 class="text-xl font-semibold">Save as Template</h3>
    </template>
    
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-form-placeholder-text mb-2">Save Mode</label>
        <div class="flex gap-4">
          <div class="flex items-center">
            <RadioButton inputId="modeNew" value="new" v-model="mode" class="mr-2" />
            <label for="modeNew">New Template</label>
          </div>
          <div class="flex items-center">
            <RadioButton inputId="modeOverwrite" value="overwrite" v-model="mode" class="mr-2" />
            <label for="modeOverwrite">Overwrite Existing</label>
          </div>
        </div>
      </div>

      <div>
        <label class="block text-sm font-semibold text-form-placeholder-text mb-2">
          {{ mode === 'overwrite' ? 'Select Template to Overwrite' : 'Template Name' }}
        </label>
        <div v-if="mode === 'overwrite'">
          <Select
            v-model="selectedId"
            :options="templates"
            optionLabel="name"
            optionValue="id"
            class="w-full"
            placeholder="Select Template"
          />
        </div>
        <div v-else>
          <InputText
            v-model="templateName"
            type="text"
            class="w-full"
            placeholder="Enter template name"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-semibold text-form-placeholder-text mb-2">Subject Preview</label>
        <div class="p-3 bg-card-bg border border-form-border rounded text-sm">{{ subject }}</div>
      </div>

      <div>
        <label class="block text-sm font-semibold text-form-placeholder-text mb-2">Body (EN) Preview</label>
        <div class="p-3 bg-card-bg border border-form-border rounded text-sm max-h-32 overflow-y-auto" v-html="bodyEn"></div>
      </div>

      <div>
        <label class="block text-sm font-semibold text-form-placeholder-text mb-2">Body (LT) Preview</label>
        <div class="p-3 bg-card-bg border border-form-border rounded text-sm max-h-32 overflow-y-auto" v-html="bodyLt"></div>
      </div>
    </div>
    
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          @click="handleClose"
        />
        <Button
          label="Save"
          severity="primary"
          @click="handleSave"
          :loading="saving"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import * as templatesApi from '@/api/templates.js'
import { getTemplateStyles } from '@/api/templates'

const props = defineProps({
  subject: String,
  bodyEn: String,
  bodyLt: String,
  style: String, // Add style prop
  templates: Array,
  show: Boolean
})

const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const mode = ref('new')
const templateName = ref('')
const selectedId = ref(null)
const saving = ref(false)
const styleOptions = ref([])

// Load available styles
onMounted(async () => {
  try {
    const response = await getTemplateStyles()
    styleOptions.value = response.styles
  } catch (error) {
    console.error('Failed to load template styles:', error)
  }
})

const isVisible = computed({
  get: () => props.show,
  set: (value) => {
    if (!value) emit('close')
  }
})

watch(() => props.show, (newValue) => {
  if (newValue) {
    mode.value = 'new'
    templateName.value = ''
    selectedId.value = null
  }
})

async function handleSave() {
  if (mode.value === 'new' && !templateName.value.trim()) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Please enter a template name',
      life: 3000
    })
    return
  }

  if (mode.value === 'overwrite' && !selectedId.value) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Please select a template to overwrite',
      life: 3000
    })
    return
  }

  saving.value = true

  try {
    const templateData = {
      name: mode.value === 'new' ? templateName.value : props.templates.find(t => t.id === selectedId.value)?.name,
      subject: props.subject,
      body_en: props.bodyEn,
      body_lt: props.bodyLt,
      style: props.style || 'elegant' // Include style
    }

    if (mode.value === 'new') {
      await templatesApi.createTemplate(templateData)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Template created successfully',
        life: 3000
      })
    } else {
      await templatesApi.updateTemplate(selectedId.value, templateData)
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Template updated successfully',
        life: 3000
      })
    }

    emit('saved')
  } catch (error) {
    console.error('Error saving template:', error)
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save template',
      life: 3000
    })
  } finally {
    saving.value = false
  }
}

function handleClose() {
  emit('close')
}
</script>