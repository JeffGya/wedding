<template>
  <Card class="max-w-2xl mx-auto mt-6">
    <template #content>
      <Banner
          v-if="message"
          :message="message"
          :type="success ? 'success' : 'error'"
          class="mt-4"
        />
      <Form @submit="saveSettings" class="space-y-4">
        <div class="flex items-center">
          <ToggleSwitch
            id="rsvp_open"
            v-model="form.rsvp_open"
            :on-label="'Yes'"
            :off-label="'No'"
            class="mr-2"
          />
          <label for="rsvp_open" class="font-medium">RSVP Open</label>
          <span class="text-sm ml-2">When off, the public RSVP form is closed for everyone.</span>
        </div>

        <div>
          <FloatLabel variant="in">
            <DatePicker
              id="rsvp_deadline"
              v-model="dateValue"
              showTime
              dateFormat="yy-mm-dd"
              hourFormat="24"
              class="w-full"
              for="in_label"
            />
            <label for="rsvp_deadline">Global RSVP Deadline</label>
          </FloatLabel>
          <span class="text-sm mt-8">After this datetime, RSVPs close automatically.</span>
        </div>

        <Button label="Save Guest Settings" type="submit" :disabled="saving" />
      </Form>
    </template>
  </Card>
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