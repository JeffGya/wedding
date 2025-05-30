<template>
  <div class="max-w-2xl mx-auto p-6 bg-white shadow rounded">
    <Banner
        v-if="message"
        :message="message"
        :type="success ? 'success' : 'error'"
        class="mt-4"
      />
    <h1 class="text-2xl font-semibold mb-4">Guest Settings</h1>
    <form @submit.prevent="saveSettings" class="space-y-4">
      <div>
        <label for="rsvp_open" class="block font-medium">RSVP Open</label>
        <input type="checkbox" id="rsvp_open" v-model="form.rsvp_open" class="mr-2" />
        <span class="text-gray-600">When off, the public RSVP form is closed for everyone.</span>
      </div>

      <div>
        <label for="rsvp_deadline" class="block font-medium">Global RSVP Deadline</label>
        <DatePicker
          v-model="dateValue"
          showTime
          dateFormat="yy-mm-dd"
          hourFormat="24"
          placeholder="Select date and time"
          class="w-full border px-3 py-2 rounded"
        />
        <span class="text-gray-600">After this datetime, RSVPs close automatically.</span>
      </div>

      <Button label="Save settings" type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" :disabled="saving" />
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import api from '@/api'
import Banner from '@/components/ui/Banner.vue';

const form = ref({
  rsvp_open: false,
  rsvp_deadline: '',
})

const dateValue = ref(null)

function formatDate(date) {
  const pad = num => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const message = ref('')
const success = ref(false)
const saving = ref(false)

const loadSettings = async () => {
  try {
    const { data } = await api.get('/settings/guests')
    form.value = data
    if (data.rsvp_deadline) {
      const [datePart, timePart] = data.rsvp_deadline.split(' ')
      const [y, m, d] = datePart.split('-').map(Number)
      const [h, mi] = timePart.split(':').map(Number)
      dateValue.value = new Date(y, m - 1, d, h, mi)
    } else {
      dateValue.value = null
    }
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

watch(dateValue, val => {
  form.value.rsvp_deadline = val ? formatDate(val) : ''
})
</script>

<style scoped>
/* Add scoped styling here if needed */
</style>