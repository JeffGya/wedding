

<template>
  <div class="space-y-4">
    <h2 class="text-2xl font-semibold">Message Composer</h2>
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

      <div v-if="tab === 'en'">
        <label class="block text-sm font-medium text-gray-700">Message (EN)</label>
        <RichTextEditor v-model="bodyEn" />
      </div>
      <div v-else>
        <label class="block text-sm font-medium text-gray-700">Message (LT)</label>
        <RichTextEditor v-model="bodyLt" />
      </div>
    </div>

    <div class="flex space-x-2">
      <button class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Save Draft</button>
      <button class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600">Schedule</button>
      <button class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Send Now</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import RichTextEditor from '@/components/forms/RichTextEditor.vue'

const tab = ref('en')
const subject = ref('')
const bodyEn = ref('')
const bodyLt = ref('')

const activeTabClasses = 'px-4 py-2 rounded bg-blue-600 text-white'
const inactiveTabClasses = 'px-4 py-2 rounded bg-gray-200 text-gray-800'
</script>