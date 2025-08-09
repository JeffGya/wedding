<template>
  <div class="space-y-8">
    <!-- Template Selection -->
    <div>
      <FloatLabel variant="in">
        <Select
          id="template"
          v-model="selectedTemplateId"
          :options="templates"
          optionLabel="name"
          optionValue="id"
          @change="loadTemplate"
          class="w-full"
          placeholder="Select a template (optional)"
        />
        <label for="template">Select a template</label>
      </FloatLabel>
    </div>

    <!-- Style Selection -->
    <div>
      <FloatLabel variant="in">
        <Select
          id="style"
          v-model="form.style"
          :options="styleOptions"
          optionLabel="name"
          optionValue="key"
          class="w-full"
          placeholder="Select email style"
        />
        <label for="style">Email Style</label>
      </FloatLabel>
    </div>

    <!-- Subject -->
    <div>
      <FloatLabel variant="in">
        <InputText
          id="subject"
          v-model="form.subject"
          class="w-full"
          placeholder="Enter message subject"
        />
        <label for="subject">Subject</label>
      </FloatLabel>
    </div>

    <!-- Content Editor -->
    <div>
      <div class="mb-4">
        <SelectButton
          v-model="tab"
          :options="languageOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
      </div>

      <div v-show="tab === 'en'">
        <label class="block text-sm font-medium mb-2">Message (English)</label>
        <RichTextEditor v-model="form.bodyEn" />
      </div>
      <div v-show="tab === 'lt'">
        <label class="block text-sm font-medium mb-2">Message (Lietuviškai)</label>
        <RichTextEditor v-model="form.bodyLt" />
      </div>
    </div>

    <!-- Save Template Modal -->
    <SaveTemplateModal
      v-if="showSaveTemplate"
      :show="showSaveTemplate"
      :subject="form.subject"
      :bodyEn="form.bodyEn"
      :bodyLt="form.bodyLt"
      :style="form.style"
      :templates="templates"
      @close="showSaveTemplate = false"
      @saved="handleTemplateSaved"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { getTemplateStyles } from '@/api/templates'
import RichTextEditor from '@/components/forms/RichTextEditor.vue'
import SaveTemplateModal from '@/components/messaging/SaveTemplateModal.vue'

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Lietuviškai', value: 'lt' }
];

const props = defineProps({
  templates: {
    type: Array,
    default: () => [],
  },
  message: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits([
  'save',
  'schedule',
  'sendNow',
  'templateSaved'
])

const selectedTemplateId = ref('')
const tab = ref('en')
const showSaveTemplate = ref(false)

const form = reactive({
  subject: '',
  bodyEn: '',
  bodyLt: '',
  style: 'elegant' // Default style
})

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

function loadTemplate() {
  const selected = props.templates.find(t => t.id === parseInt(selectedTemplateId.value))
  if (selected) {
    const hasExistingContent = form.subject || form.bodyEn || form.bodyLt
    const confirmOverwrite = !hasExistingContent || window.confirm('This will replace your current message content. Continue?')
    if (confirmOverwrite) {
      form.subject = selected.subject || ''
      form.bodyEn = selected.body_en || ''
      form.bodyLt = selected.body_lt || ''
      form.style = selected.style || 'elegant' // Load template style
    }
  }
}

watch(() => props.message, (newMsg) => {
  if (newMsg) {
    form.subject = newMsg.subject || ''
    form.bodyEn = newMsg.body_en || ''
    form.bodyLt = newMsg.body_lt || ''
  }
}, { immediate: true })

// Watch for form changes
watch(() => form.bodyEn, (newValue) => {
})

watch(() => form.bodyLt, (newValue) => {
})

const getData = () => {
  const data = {
    subject: form.subject,
    body_en: form.bodyEn,
    body_lt: form.bodyLt,
    style: form.style
  }
  return data;
}

const setData = ({ subject, body_en, body_lt, style }) => {
  form.subject = subject || ''
  form.bodyEn = body_en || ''
  form.bodyLt = body_lt || ''
  form.style = style || 'elegant'
}

function handleTemplateSaved() {
  emit('templateSaved')
  showSaveTemplate.value = false
}

defineExpose({
  getData,
  setData,
})
</script>