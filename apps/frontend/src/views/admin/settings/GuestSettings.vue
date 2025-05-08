<template>
  <div class="max-w-2xl mx-auto p-6 bg-white shadow rounded">
    <h1 class="text-2xl font-semibold mb-4">Guest Settings</h1>
    <form @submit.prevent="saveSettings" class="space-y-4">
      <div>
        <label for="rsvp_open" class="block font-medium">RSVP Open</label>
        <input type="checkbox" id="rsvp_open" v-model="form.rsvp_open" class="mr-2" />
        <span class="text-gray-600">When off, the public RSVP form is closed for everyone.</span>
      </div>

      <div>
        <label for="rsvp_deadline" class="block font-medium">Global RSVP Deadline</label>
        <VueDatePicker
          v-model="form.rsvp_deadline"
          type="datetime"
          :format="'yyyy-MM-dd HH:mm'"
          placeholder="Select date and time"
          class="w-full border px-3 py-2 rounded"
        />
        <span class="text-gray-600">After this datetime, RSVPs close automatically.</span>
      </div>

      <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" :disabled="saving">
        Save Settings
      </button>

      <p v-if="message" :class="{'text-green-600': success, 'text-red-600': !success}" class="mt-4">{{ message }}</p>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

const form = ref({
  rsvp_open: false,
  rsvp_deadline: '',
})

const message = ref('')
const success = ref(false)
const saving = ref(false)

const loadSettings = async () => {
  try {
    const { data } = await api.get('/settings/guests')
    form.value = data
  } catch (err) {
    console.error('Failed to load guest settings:', err)
  }
}

const saveSettings = async () => {
  saving.value = true
  message.value = ''
  try {
    await api.post('/settings/guests', form.value)
    message.value = 'Settings saved successfully.'
    success.value = true
  } catch (err) {
    console.error('Failed to save guest settings:', err)
    message.value = 'Error saving settings.'
    success.value = false
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<style scoped>
/* Add scoped styling here if needed */
</style>