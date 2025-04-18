<template>
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Message Composer</h2>
    
    <div>
      <label for="template" class="block text-sm font-medium text-gray-700">Load Template</label>
      <select
        id="template"
        v-model="selectedTemplateId"
        @change="loadTemplate"
        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
      >
        <option disabled value="">Select a template</option>
        <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">
          {{ tpl.name }}
        </option>
      </select>
    </div>

    <div>
      <label for="subject" class="block text-sm font-medium text-gray-700">Subject</label>
      <input
        id="subject"
        type="text"
        v-model="subject"
        class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
      />
    </div>

    <div>
      <div class="flex space-x-2 mb-2">
        <button
          :class="tab === 'en' ? activeTabClasses : inactiveTabClasses"
          @click="tab = 'en'"
        >
          English
        </button>
        <button
          :class="tab === 'lt' ? activeTabClasses : inactiveTabClasses"
          @click="tab = 'lt'"
        >
          Lietuviškai
        </button>
      </div>

      <div v-show="tab === 'en'">
        <label class="block text-sm font-medium text-gray-700">Message (EN)</label>
        <RichTextEditor v-model="bodyEn" />
      </div>
      <div v-show="tab === 'lt'">
        <label class="block text-sm font-medium text-gray-700">Message (LT)</label>
        <RichTextEditor v-model="bodyLt" />
      </div>
    </div>

    <div class="flex space-x-2">
      <button @click="$emit('save')" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Save Draft</button>
      <button @click="$emit('schedule')" class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">Schedule</button>
      <button @click="$emit('sendNow')" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Send Now</button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import RichTextEditor from '@/components/forms/RichTextEditor.vue'

const props = defineProps({
  templates: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits([
  'save',
  'schedule',
  'sendNow',
])

const selectedTemplateId = ref('')
const tab = ref('en')

const subject = ref('')
const bodyEn = ref('')
const bodyLt = ref('')

const activeTabClasses = 'px-4 py-2 rounded bg-blue-600 text-white'
const inactiveTabClasses = 'px-4 py-2 rounded bg-gray-200 text-gray-800'

function loadTemplate() {
  const selected = props.templates.find(t => t.id === parseInt(selectedTemplateId.value))
  if (selected) {
    const hasExistingContent = subject.value || bodyEn.value || bodyLt.value
    const confirmOverwrite = !hasExistingContent || window.confirm('This will replace your current message content. Continue?')
    if (confirmOverwrite) {
      subject.value = selected.subject || ''
      bodyEn.value = selected.body_en || ''
      bodyLt.value = selected.body_lt || ''
    }
  }
}

const getData = () => ({
  subject: subject.value,
  body_en: bodyEn.value,
  body_lt: bodyLt.value,
})

console.log('🔍 getData() called')
console.log('✏️ Subject:', subject.value)
console.log('📝 Body EN:', bodyEn.value)
console.log('📝 Body LT:', bodyLt.value)

defineExpose({ getData })
</script>