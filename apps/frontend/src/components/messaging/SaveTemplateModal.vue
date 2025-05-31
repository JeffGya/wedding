<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">Save as Template</h2>
        <button @click="$emit('close')" class="text-gray-500 hover:text-gray-700">✕</button>
      </div>

      <div class="mb-4">
        <label class="block font-medium mb-1">Save Mode</label>
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

      <div class="mb-4">
        <label class="block font-medium mb-1">
          {{ mode === 'overwrite' ? 'Select Template to Overwrite' : 'Template Name' }}
        </label>
        <div v-if="mode === 'overwrite'">
          <FloatLabel variant="in">
            <Select
              id="selected_template"
              v-model="selectedId"
              :options="templates"
              optionLabel="name"
              optionValue="id"
              class="w-full"
            />
            <label for="selected_template">Select Template</label>
          </FloatLabel>
        </div>
        <div v-else>
          <FloatLabel variant="in">
            <InputText
              id="templateName"
              v-model="templateName"
              type="text"
              class="w-full"
            />
            <label for="templateName">Template Name</label>
          </FloatLabel>
        </div>
      </div>

      <div class="mb-4">
        <label class="block font-medium mb-1">Subject Preview</label>
        <div class="border p-3 bg-gray-50 rounded">{{ subject }}</div>
      </div>

      <div class="mb-4">
        <label class="block font-medium mb-1">Body (EN) Preview</label>
        <div class="border p-3 bg-gray-50 rounded text-sm" v-html="bodyEn"></div>
      </div>

      <div class="mb-4">
        <label class="block font-medium mb-1">Body (LT) Preview</label>
        <div class="border p-3 bg-gray-50 rounded text-sm" v-html="bodyLt"></div>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <Button
          label="Cancel"
          severity="secondary"
          icon="i-solar:close-square-bold"
          iconPos="right"
          size="large"
          @click="$emit('close')"
        />
        <Button
          label="Save"
          icon="i-solar:check-square-bold"
          iconPos="right"
          size="large"
          @click="handleSave"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api'
import { useToast as usePrimeToast } from 'primevue/usetoast';

const props = defineProps({
  subject: String,
  bodyEn: String,
  bodyLt: String,
  templates: Array,
  show: Boolean
})

const emit = defineEmits(['close', 'saved'])
const primeToast = usePrimeToast()

const mode = ref('new')
const templateName = ref('')
const selectedId = ref('')

async function handleSave() {
  try {
    if (mode.value === 'new') {
      if (!templateName.value) {
        primeToast.add({ severity: 'error', summary: 'Error', detail: 'Template name is required' });
        return
      }
      await api.post('/templates', {
        name: templateName.value,
        subject: props.subject,
        body_en: props.bodyEn,
        body_lt: props.bodyLt
      })
    } else {
      if (!selectedId.value) {
        primeToast.add({ severity: 'error', summary: 'Error', detail: 'Select a template to overwrite' });
        return
      }
      await api.put(`/templates/${selectedId.value}`, {
        name: props.templates.find(t => t.id === selectedId.value)?.name || '',
        subject: props.subject,
        body_en: props.bodyEn,
        body_lt: props.bodyLt
      })
    }

    primeToast.add({ 
      severity: 'success', 
      ummary: 'Success', 
      detail: 'Template saved successfully',
      life: '5000' 
    });
    emit('saved')
    emit('close')
  } catch (err) {
    primeToast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: 'Failed to save template',
      life: '5000' 
    });
  }
}
</script>