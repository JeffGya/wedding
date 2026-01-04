<template>
  <AdminPageWrapper 
    title="Guest Settings" 
    description="Configure RSVP settings and deadlines for guest responses"
  >
    <Card>
      <template #content>
        <form @submit.prevent="saveSettings" class="space-y-6">
          <!-- RSVP Open Toggle -->
          <div class="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <ToggleSwitch
              id="rsvp_open"
              v-model="form.rsvp_open"
            />
            <div>
              <label for="rsvp_open" class="block text-sm font-medium">RSVP Open</label>
              <p class="text-sm text-gray-600">Allow guests to submit RSVPs through the public form</p>
            </div>
          </div>

          <!-- RSVP Deadline -->
          <div>
            <FloatLabel variant="in">
              <DatePicker
                id="rsvp_deadline"
                v-model="dateValue"
                showTime
                dateFormat="yy-mm-dd"
                hourFormat="24"
                class="w-full"
                placeholder="Select RSVP deadline"
                :minDate="new Date()"
              />
              <label for="rsvp_deadline">RSVP Deadline</label>
            </FloatLabel>
            <p class="text-sm text-gray-600 mt-1">
              After this date and time, RSVPs will be automatically closed
            </p>
          </div>

          <!-- Current Status Display -->
          <div class="p-4 bg-blue-50 rounded-lg">
            <h4 class="font-medium text-blue-900 mb-2">Current Status</h4>
            <div class="space-y-1 text-sm">
              <div class="flex items-center gap-2">
                <i class="pi pi-calendar text-blue-600"></i>
                <span class="text-blue-800">
                  RSVP Status: 
                  <span :class="form.rsvp_open ? 'text-green-600 font-medium' : 'text-red-600 font-medium'">
                    {{ form.rsvp_open ? 'Open' : 'Closed' }}
                  </span>
                </span>
              </div>
              <div v-if="form.rsvp_deadline" class="flex items-center gap-2">
                <i class="pi pi-clock text-blue-600"></i>
                <span class="text-blue-800">
                  Deadline: {{ formatDeadline(form.rsvp_deadline) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 pt-4 border-t">
            <Button
              label="Save Settings"
              icon="i-solar:diskette-bold"
              type="submit"
              :loading="saving"
            />
            <Button
              label="Reset"
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              @click="resetSettings"
            />
          </div>
        </form>
      </template>
    </Card>
  </AdminPageWrapper>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { fetchGuestSettings, updateGuestSettings, validateGuestSettings } from '@/api/settings'
import { useToastService } from '@/utils/toastService'
import { formatDateWithTime } from '@/utils/dateFormatter'
import { useErrorHandler } from '@/composables/useErrorHandler'

const { showSuccess } = useToastService()
const { handleError } = useErrorHandler({ showToast: true })

const form = ref({
  rsvp_open: false,
  rsvp_deadline: ''
})

const dateValue = ref(null)
const saving = ref(false)

onMounted(async () => {
  await loadSettings()
})

async function loadSettings() {
  try {
    const settings = await fetchGuestSettings()
    form.value = {
      rsvp_open: settings.rsvp_open || false,
      rsvp_deadline: settings.rsvp_deadline || ''
    }
    
    if (settings.rsvp_deadline) {
      // Parse the backend format "YYYY-MM-DD HH:MM:SS" to Date object
      const [datePart, timePart] = settings.rsvp_deadline.split(' ')
      const [year, month, day] = datePart.split('-').map(Number)
      const [hours, minutes, seconds] = timePart.split(':').map(Number)
      dateValue.value = new Date(year, month - 1, day, hours, minutes, seconds)
    } else {
      dateValue.value = null
    }
  } catch (error) {
    handleError(error, 'Failed to load guest settings')
  }
}

async function saveSettings() {
  // Validate settings
  const validation = validateGuestSettings(form.value)
  if (!validation.isValid) {
    handleError(new Error(validation.errors.join(', ')), 'Validation Error')
    return
  }

  try {
    saving.value = true
    await updateGuestSettings(form.value)
    showSuccess('Success', 'Guest settings saved successfully', 5000)
  } catch (error) {
    handleError(error, 'Failed to save guest settings')
  } finally {
    saving.value = false
  }
}

function resetSettings() {
  loadSettings()
}

// Use centralized date formatter utility
function formatDeadline(deadline) {
  if (!deadline) return 'Not set'
  return formatDateWithTime(deadline)
}

// Watch for date picker changes
watch(dateValue, (newValue) => {
  if (newValue) {
    // Format date as YYYY-MM-DD HH:MM:SS for MySQL DATETIME
    const year = newValue.getFullYear()
    const month = String(newValue.getMonth() + 1).padStart(2, '0')
    const day = String(newValue.getDate()).padStart(2, '0')
    const hours = String(newValue.getHours()).padStart(2, '0')
    const minutes = String(newValue.getMinutes()).padStart(2, '0')
    const seconds = String(newValue.getSeconds()).padStart(2, '0')
    
    form.value.rsvp_deadline = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } else {
    form.value.rsvp_deadline = ''
  }
})
</script>