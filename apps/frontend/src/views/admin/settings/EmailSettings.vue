<template>
  <div class="max-w-2xl mx-auto p-6 bg-white shadow rounded">
    <h1 class="text-2xl font-semibold mb-4">Email Settings</h1>
    <form @submit.prevent="saveSettings" class="space-y-4">
      <div>
        <label for="provider" class="block font-medium">Provider</label>
        <select v-model="form.provider" id="provider" class="w-full border px-3 py-2 rounded">
          <option value="resend">Resend</option>
          <!-- Future providers can go here -->
        </select>
      </div>

      <div>
        <label for="api_key" class="block font-medium">API Key</label>
        <input v-model="form.api_key" type="text" id="api_key" class="w-full border px-3 py-2 rounded" />
      </div>

      <div>
        <label for="from_name" class="block font-medium">From Name</label>
        <input v-model="form.from_name" type="text" id="from_name" class="w-full border px-3 py-2 rounded" />
      </div>

      <div>
        <label for="from_email" class="block font-medium">From Email</label>
        <input v-model="form.from_email" type="email" id="from_email" class="w-full border px-3 py-2 rounded" />
      </div>

      <div>
        <label for="sender_name" class="block font-medium">Sender Name</label>
        <input v-model="form.sender_name" type="text" id="sender_name" class="w-full border px-3 py-2 rounded" />
      </div>

      <div>
        <label for="sender_email" class="block font-medium">Sender Email</label>
        <input v-model="form.sender_email" type="email" id="sender_email" class="w-full border px-3 py-2 rounded" />
      </div>

      <div class="flex items-center">
        <input v-model="form.enabled" type="checkbox" id="enabled" class="mr-2" />
        <label for="enabled" class="font-medium">Enable Email Sending</label>
      </div>

      <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Save</button>
    </form>
    <p v-if="message" class="text-green-600 mt-4">{{ message }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const form = ref({
  provider: 'resend',
  api_key: '',
  from_name: '',
  from_email: '',
  sender_name: '',
  sender_email: '',
  enabled: false
})

const message = ref('')

const loadSettings = async () => {
  try {
    const { data } = await api.get('/settings/email')
    form.value = data
  } catch (err) {
    console.error('Failed to load settings:', err)
  }
}

const saveSettings = async () => {
  try {
    await api.post('/settings/email', form.value)
    message.value = 'Settings saved successfully.'
  } catch (err) {
    console.error('Failed to save settings:', err)
    message.value = 'Error saving settings.'
  }
}

onMounted(loadSettings)
</script>

<style scoped>
/* Optional scoped styling can go here */
</style>
