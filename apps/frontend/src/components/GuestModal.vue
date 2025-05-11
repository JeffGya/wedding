<template>
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded shadow-md w-full max-w-lg relative">
        <button
          @click="$emit('close')"
          class="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          aria-label="Close modal"
        >
          &times;
        </button>
        <h2 class="text-xl font-semibold mb-4">{{ isEdit ? 'Edit Guest' : 'Add Guest' }}</h2>
  
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-left font-medium mb-1">Group Label</label>
            <input v-model="form.group_label" type="text" class="w-full border px-3 py-2 rounded" required />
          </div>
  
          <div>
            <label class="block text-left font-medium mb-1">Name</label>
            <input v-model="form.name" type="text" class="w-full border px-3 py-2 rounded" required />
          </div>
  
          <div>
            <label class="block text-left font-medium mb-1">Email</label>
            <input v-model="form.email" type="email" class="w-full border px-3 py-2 rounded" required />
          </div>
          <div>
            <label class="block text-left font-medium mb-1">Preferred Language</label>
            <select v-model="form.preferred_language" class="w-full border px-3 py-2 rounded">
              <option value="en">English</option>
              <option value="lt">Lithuanian</option>
            </select>
          </div>
  
          <div>
    <label class="block text-left font-medium mb-1">Code</label>
    <input
      v-model="form.code"
      type="text"
      class="w-full border px-3 py-2 rounded"
      placeholder="Auto-generated if left blank"
    />
  </div>
  <div class="flex items-center">
    <input
      v-model="form.can_bring_plus_one"
      type="checkbox"
      id="plusOneCheckbox"
      class="mr-2"
    />
    <label for="plusOneCheckbox" class="font-medium">Allow Plus One</label>
  </div>
  <div class="flex items-center">
    <input
      v-model="form.is_primary"
      type="checkbox"
      id="primaryCheckbox"
      class="mr-2"
    />
    <label for="primaryCheckbox" class="font-medium">Primary Guest</label>
  </div>
  
          <div class="flex justify-end gap-2 mt-4">
            <button type="button" @click="$emit('close')" class="px-4 py-2 border rounded">Cancel</button>
            <button type="submit" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              {{ isEdit ? 'Update' : 'Create' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </template>
  
  <script setup>
  import { reactive, watch } from 'vue'
  const props = defineProps({
    guest: Object,
    isEdit: Boolean
  })
  const emit = defineEmits(['save', 'close'])
  
  const form = reactive({
    group_label: '',
    name: '',
    email: '',
    code: '',
    can_bring_plus_one: false,
    is_primary: true,
    preferred_language: 'en',
  })
  
  watch(() => props.guest, (newGuest) => {
    if (newGuest) {
      form.group_label = newGuest.group_label
      form.name = newGuest.name
      form.email = newGuest.email
      form.code = newGuest.code ?? ''
      form.can_bring_plus_one = newGuest.can_bring_plus_one ?? false
      form.is_primary = newGuest.is_primary ?? true
      form.preferred_language = newGuest.preferred_language ?? 'en'
    } else {
      form.group_label = ''
      form.name = ''
      form.email = ''
      form.code = ''
      form.can_bring_plus_one = false
      form.is_primary = true
      form.preferred_language = 'en'
    }
  }, { immediate: true })
  
const handleSubmit = () => {
  // Generate a random code if none provided
  const codeValue = form.code.trim() !== ''
    ? form.code.trim()
    : Math.random().toString(36).substring(2, 8).toUpperCase()
  emit('save', {
    group_label: form.group_label,
    name: form.name,
    email: form.email,
    code: codeValue,
    can_bring_plus_one: form.can_bring_plus_one,
    is_primary: form.is_primary,
    preferred_language: form.preferred_language,
  })
}
  </script>