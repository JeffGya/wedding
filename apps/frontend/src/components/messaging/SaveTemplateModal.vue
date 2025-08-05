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

const props = defineProps({
  subject: String,
  bodyEn: String,
  bodyLt: String,
  templates: Array,
  show: Boolean
})

const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const mode = ref('new')
const templateName = ref('')
const selectedId = ref('')
const saving = ref(false)

// Computed property for Dialog visibility
const isVisible = computed({
  get: () => props.show,
  set: (value) => {
    if (!value) {
      emit('close')
    }
  }
})

// Reset form when modal opens
watch(() => props.show, (newValue) => {
  if (newValue) {
    mode.value = 'new'
    templateName.value = ''
    selectedId.value = ''
  }
})

const handleClose = () => {
  emit('close')
}

async function handleSave() {
  saving.value = true
  
  try {
    if (mode.value === 'new') {
      if (!templateName.value) {
        toast.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Template name is required',
          life: 3000
        })
        return
      }
      await templatesApi.createTemplate({
        name: templateName.value,
        subject: props.subject,
        body_en: props.bodyEn,
        body_lt: props.bodyLt
      })
    } else {
      if (!selectedId.value) {
        toast.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Select a template to overwrite',
          life: 3000
        })
        return
      }
      await templatesApi.updateTemplate(selectedId.value, {
        name: props.templates.find(t => t.id === selectedId.value)?.name || '',
        subject: props.subject,
        body_en: props.bodyEn,
        body_lt: props.bodyLt
      })
    }

    toast.add({ 
      severity: 'success', 
      summary: 'Success', 
      detail: 'Template saved successfully',
      life: 3000
    })
    emit('saved')
    emit('close')
  } catch (error) {
    console.error('Failed to save template:', error)
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: error.response?.data?.error || 'Failed to save template',
      life: 3000
    })
  } finally {
    saving.value = false
  }
}
</script>