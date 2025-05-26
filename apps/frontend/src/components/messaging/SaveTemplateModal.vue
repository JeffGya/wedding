

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
          <label class="inline-flex items-center">
            <input type="radio" value="new" v-model="mode" class="mr-2" />
            New Template
          </label>
          <label class="inline-flex items-center">
            <input type="radio" value="overwrite" v-model="mode" class="mr-2" />
            Overwrite Existing
          </label>
        </div>
      </div>

      <div class="mb-4">
        <label class="block font-medium mb-1">
          {{ mode === 'overwrite' ? 'Select Template to Overwrite' : 'Template Name' }}
        </label>
        <div v-if="mode === 'overwrite'">
          <select v-model="selectedId" class="w-full border px-3 py-2 rounded">
            <option disabled value="">Select template</option>
            <option v-for="template in templates" :key="template.id" :value="template.id">
              {{ template.name }}
            </option>
          </select>
        </div>
        <div v-else>
          <input v-model="templateName" class="w-full border px-3 py-2 rounded" placeholder="Enter name..." />
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
        <button @click="$emit('close')" class="px-4 py-2 border rounded">Cancel</button>
        <button @click="handleSave" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import api from '@/api'
import { useToast } from 'vue-toastification'

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

async function handleSave() {
  try {
    if (mode.value === 'new') {
      if (!templateName.value) {
        toast.error('Template name is required')
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
        toast.error('Select a template to overwrite')
        return
      }
      await api.put(`/templates/${selectedId.value}`, {
        name: props.templates.find(t => t.id === selectedId.value)?.name || '',
        subject: props.subject,
        body_en: props.bodyEn,
        body_lt: props.bodyLt
      })
    }

    toast.success('Template saved successfully')
    emit('saved')
    emit('close')
  } catch (err) {
    toast.error('Failed to save template')
  }
}
</script>