<template>
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
            <label class="block text-left font-medium mb-1">Number of Kids</label>
            <input v-model.number="form.num_kids" type="number" min="0" class="w-full border px-3 py-2 rounded" />
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
    num_kids: 0
  })
  
  watch(() => props.guest, (newGuest) => {
    if (newGuest) {
      form.group_label = newGuest.group_label
      form.name = newGuest.name
      form.email = newGuest.email
      form.num_kids = newGuest.num_kids ?? 0
    } else {
      form.group_label = ''
      form.name = ''
      form.email = ''
      form.num_kids = 0
    }
  }, { immediate: true })
  
  const handleSubmit = () => {
    emit('save', { ...form })
  }
  </script>