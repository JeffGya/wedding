<template>
  <div class="space-y-8">
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
        />
        <label for="template">Select a template</label>
      </FloatLabel>
    </div>

    <div>
      <FloatLabel variant="in">
        <InputText
          id="subject"
          v-model="form.subject"
          class="w-full"
        />
        <label for="subject">Subject</label>
      </FloatLabel>
    </div>

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
        <label class="block text-sm font-medium mb-16">Message (EN)</label>
        <RichTextEditor v-model="form.bodyEn" />
      </div>
      <div v-show="tab === 'lt'">
        <label class="block text-sm font-medium mb-16">Message (LT)</label>
        <RichTextEditor v-model="form.bodyLt" />
      </div>
    </div>

    <!-- Action buttons moved to dedicated MessageActionsBar component -->
    
    <SaveTemplateModal
      v-if="showSaveTemplate"
      :show="showSaveTemplate"
      :subject="form.subject"
      :bodyEn="form.bodyEn"
      :bodyLt="form.bodyLt"
      :templates="templates"
      @close="showSaveTemplate = false"
      @saved="handleTemplateSaved"
    />
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import RichTextEditor from '@/components/forms/RichTextEditor.vue'
import SaveTemplateModal from '@/components/messaging/SaveTemplateModal.vue'
import SelectButton from 'primevue/selectbutton';

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
])

const selectedTemplateId = ref('')
const tab = ref('en')
const showSaveTemplate = ref(false)

const form = reactive({
  subject: '',
  bodyEn: '',
  bodyLt: '',
})

const activeTabClasses = 'px-4 py-2 rounded bg-blue-600 text-white'
const inactiveTabClasses = 'px-4 py-2 rounded bg-gray-200 text-gray-800'

function loadTemplate() {
  const selected = props.templates.find(t => t.id === parseInt(selectedTemplateId.value))
  if (selected) {
    const hasExistingContent = form.subject || form.bodyEn || form.bodyLt
    const confirmOverwrite = !hasExistingContent || window.confirm('This will replace your current message content. Continue?')
    if (confirmOverwrite) {
      form.subject = selected.subject || ''
      form.bodyEn = selected.body_en || ''
      form.bodyLt = selected.body_lt || ''
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

const getData = () => ({
  subject: form.subject,
  body_en: form.bodyEn,
  body_lt: form.bodyLt,
})

const setData = ({ subject, body_en, body_lt }) => {
  form.subject = subject || ''
  form.bodyEn = body_en || ''
  form.bodyLt = body_lt || ''
}

function handleTemplateSaved() {
  // You could emit an event here or trigger a reload of templates
  console.log('✅ Template saved')
}

defineExpose({
  getData,
  setData,
})
</script>