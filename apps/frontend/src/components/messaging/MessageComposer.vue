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
      <div class="mt-3 flex justify-end">
        <Button label="Preview" icon="pi pi-eye" @click="openPreview" />
      </div>
    </div>

    <!-- Subject Fields -->
    <div class="space-y-4">
      <FloatLabel variant="in">
        <InputText
          id="subjectEn"
          v-model="form.subjectEn"
          class="w-full"
          placeholder="Enter message subject (English)"
        />
        <label for="subjectEn">Subject (English)</label>
      </FloatLabel>
      <FloatLabel variant="in">
        <InputText
          id="subjectLt"
          v-model="form.subjectLt"
          class="w-full"
          placeholder="Enter message subject (Lithuanian)"
        />
        <label for="subjectLt">Subject (Lithuanian)</label>
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
          <RichTextEditor v-model="form.bodyEn" :context="'email'" />
        </div>
        <div v-show="tab === 'lt'">
          <label class="block text-sm font-medium mb-2">Message (Lietuviškai)</label>
          <RichTextEditor v-model="form.bodyLt" :context="'email'" />
        </div>
    </div>

    <!-- Save Template Modal -->
    <SaveTemplateModal
      v-if="showSaveTemplate"
      :show="showSaveTemplate"
      :subjectEn="form.subjectEn"
      :subjectLt="form.subjectLt"
      :bodyEn="form.bodyEn"
      :bodyLt="form.bodyLt"
      :style="form.style"
      :templates="templates"
      @close="showSaveTemplate = false"
      @saved="handleTemplateSaved"
    />
  </div>

  <!-- Message Preview Dialog -->
  <MessagePreview
    v-model:visible="previewVisible"
    :message="previewMessage"
    title="Email Preview"
  />
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { getTemplateStyles } from '@/api/templates'
import RichTextEditor from '@/components/forms/RichTextEditor.vue'
import SaveTemplateModal from '@/components/messaging/SaveTemplateModal.vue'
import MessagePreview from '@/components/messaging/MessagePreview.vue'

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
const previewVisible = ref(false)

const form = reactive({
  subjectEn: '',
  subjectLt: '',
  bodyEn: '',
  bodyLt: '',
  style: 'elegant' // Default style
})

const styleOptions = ref([])

// Computed property for the preview message
const previewMessage = computed(() => ({
  subject: form.subjectEn, // Use English subject for preview
  subjectEn: form.subjectEn,
  subjectLt: form.subjectLt,
  bodyEn: form.bodyEn,
  bodyLt: form.bodyLt,
  style: form.style,
}))

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
    const hasExistingContent = form.subjectEn || form.subjectLt || form.bodyEn || form.bodyLt
    const confirmOverwrite = !hasExistingContent || window.confirm('This will replace your current message content. Continue?')
    if (confirmOverwrite) {
      form.subjectEn = selected.subject_en || selected.subject || ''
      form.subjectLt = selected.subject_lt || selected.subject || ''
      form.bodyEn = selected.body_en || ''
      form.bodyLt = selected.body_lt || ''
      form.style = selected.style || 'elegant' // Load template style
    }
  }
}

watch(() => props.message, (newMsg) => {
  if (newMsg) {
    // Support both new format (subject_en/subject_lt) and old format (subject)
    form.subjectEn = newMsg.subject_en || newMsg.subject || ''
    form.subjectLt = newMsg.subject_lt || newMsg.subject || ''
    form.bodyEn = newMsg.body_en || ''
    form.bodyLt = newMsg.body_lt || ''
    form.style = newMsg.style || 'elegant'
  }
}, { immediate: true })

// Watch for form changes
watch(() => form.bodyEn, (newValue) => {
})

watch(() => form.bodyLt, (newValue) => {
})

const getData = () => {
  const data = {
    subject_en: form.subjectEn,
    subject_lt: form.subjectLt,
    body_en: form.bodyEn,
    body_lt: form.bodyLt,
    style: form.style
  }
  return data;
}

const setData = ({ subject, subject_en, subject_lt, body_en, body_lt, style }) => {
  // Support both new format (subject_en/subject_lt) and old format (subject)
  form.subjectEn = subject_en || subject || ''
  form.subjectLt = subject_lt || subject || ''
  form.bodyEn = body_en || ''
  form.bodyLt = body_lt || ''
  form.style = style || 'elegant'
}

function handleTemplateSaved() {
  emit('templateSaved')
  showSaveTemplate.value = false
}

function openPreview() {
  previewVisible.value = true
}

defineExpose({
  getData,
  setData,
})
</script>