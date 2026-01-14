<template>
  <AdminPageWrapper 
    title="Main Settings" 
    description="Configure global site settings and wedding information"
  >
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Basic Settings -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="i-solar-settings-bold-duotone text-acc-base"></i>
            <span>Basic Settings</span>
          </div>
        </template>
        <template #content>
          <form @submit.prevent="saveSettings" class="space-y-6">
            <!-- Global Countdown Toggle -->
            <div class="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <ToggleSwitch
                id="enable_global_countdown"
                v-model="form.enable_global_countdown"
              />
              <div>
                <label for="enable_global_countdown" class="block text-sm font-medium">
                  Enable Wedding Countdown
                </label>
                <p class="text-sm text-gray-600">
                  Show a countdown timer on the main wedding page
                </p>
              </div>
            </div>

            <!-- Wedding Date -->
            <div>
              <FloatLabel variant="in">
                <DatePicker
                  id="wedding_date"
                  v-model="dateValue"
                  dateFormat="yy-mm-dd"
                  class="w-full"
                  placeholder="Select wedding date"
                  :minDate="new Date()"
                />
                <label for="wedding_date">Wedding Date</label>
              </FloatLabel>
              <p class="text-sm text-gray-600 mt-1">
                The date of your wedding (required if countdown is enabled)
              </p>
            </div>

            <!-- App Title -->
            <div>
              <FloatLabel variant="in">
                <InputText
                  id="app_title"
                  v-model="form.app_title"
                  class="w-full"
                  placeholder="Enter app title"
                />
                <label for="app_title">App Title</label>
              </FloatLabel>
              <p class="text-sm text-gray-600 mt-1">
                The title displayed in the browser and app
              </p>
            </div>

            <!-- Website URL -->
            <div>
              <FloatLabel variant="in">
                <InputText
                  id="website_url"
                  v-model="form.website_url"
                  class="w-full"
                  placeholder="https://your-wedding-site.com"
                />
                <label for="website_url">Website URL</label>
              </FloatLabel>
              <p class="text-sm text-gray-600 mt-1">
                Your wedding website URL for links in emails
              </p>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3 pt-4 border-t">
              <Button
                label="Save Settings"
                icon="i-solar-disk-bold-duotone"
                type="submit"
                :loading="saving"
              />
              <Button
                label="Reset"
                icon="i-solar-refresh-bold-duotone"
                severity="secondary"
                outlined
                @click="resetSettings"
              />
            </div>
          </form>
        </template>
      </Card>

      <!-- Event Information -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="i-solar-calendar-bold-duotone text-acc-base"></i>
            <span>Event Information</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <!-- Venue Information -->
            <div>
              <label class="block text-sm font-medium mb-2">Venue</label>
              <div class="space-y-3">
                <InputText
                  v-model="form.venue_name"
                  placeholder="Venue name"
                  class="w-full"
                />
                <Textarea
                  v-model="form.venue_address"
                  placeholder="Full venue address"
                  rows="3"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Event Dates -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-2">Event Start Date</label>
                <Calendar
                  v-model="eventStartDate"
                  dateFormat="yy-mm-dd"
                  class="w-full"
                  placeholder="Start date"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">Event End Date</label>
                <Calendar
                  v-model="eventEndDate"
                  dateFormat="yy-mm-dd"
                  class="w-full"
                  placeholder="End date"
                />
              </div>
            </div>

            <!-- Event Time -->
            <div>
              <label class="block text-sm font-medium mb-2">Event Time</label>
              <InputText
                v-model="form.event_time"
                placeholder="e.g., 2:00 PM - 11:00 PM"
                class="w-full"
                type="text"
                autocomplete="off"
              />
            </div>

            <!-- Event Type -->
            <div>
              <label class="block text-sm font-medium mb-2">Event Type</label>
              <Dropdown
                v-model="form.event_type"
                :options="eventTypeOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Select event type"
                class="w-full"
              />
            </div>

            <!-- Dress Code -->
            <div>
              <label class="block text-sm font-medium mb-2">Dress Code</label>
              <InputText
                v-model="form.dress_code"
                placeholder="e.g., Formal, Casual, Black Tie"
                class="w-full"
              />
            </div>

            <!-- Special Instructions -->
            <div>
              <label class="block text-sm font-medium mb-2">Special Instructions</label>
              <Textarea
                v-model="form.special_instructions"
                placeholder="Any special instructions for guests"
                rows="3"
                class="w-full"
              />
            </div>
          </div>
        </template>
      </Card>

      <!-- Contact Information -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="i-solar-user-bold-duotone text-acc-base"></i>
            <span>Contact Information</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-4">
            <!-- Bride & Groom Names -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-2">Bride's Name</label>
                <InputText
                  v-model="form.bride_name"
                  placeholder="Bride's name"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">Groom's Name</label>
                <InputText
                  v-model="form.groom_name"
                  placeholder="Groom's name"
                  class="w-full"
                />
              </div>
            </div>

            <!-- Contact Details -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-2">Contact Email</label>
                <InputText
                  v-model="form.contact_email"
                  placeholder="contact@example.com"
                  class="w-full"
                />
              </div>
              <div>
                <label class="block text-sm font-medium mb-2">Contact Phone</label>
                <InputText
                  v-model="form.contact_phone"
                  placeholder="+1 234 567 8900"
                  class="w-full"
                />
              </div>
            </div>
          </div>
        </template>
      </Card>


    </div>

    <!-- Current Settings Display -->
    <Card class="mt-6">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="i-solar-info-circle-bold-duotone text-acc-base"></i>
          <span>Current Settings Summary</span>
        </div>
      </template>
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div class="flex items-center gap-2">
            <i class="i-solar-calendar-bold-duotone text-blue-600"></i>
            <span class="text-blue-800">
              Countdown: 
              <span :class="form.enable_global_countdown ? 'text-green-600 font-medium' : 'text-red-600 font-medium'">
                {{ form.enable_global_countdown ? 'Enabled' : 'Disabled' }}
              </span>
            </span>
          </div>
          <div v-if="form.wedding_date" class="flex items-center gap-2">
            <i class="i-solar-heart-bold-duotone text-blue-600"></i>
            <span class="text-blue-800">
              Wedding Date: {{ formatWeddingDate(form.wedding_date) }}
            </span>
          </div>
          <div v-if="form.venue_name" class="flex items-center gap-2">
            <i class="i-solar-map-point-bold-duotone text-blue-600"></i>
            <span class="text-blue-800">Venue: {{ form.venue_name }}</span>
          </div>
          <div v-if="form.bride_name || form.groom_name" class="flex items-center gap-2">
            <i class="i-solar-users-group-bold-duotone text-blue-600"></i>
            <span class="text-blue-800">
              {{ form.bride_name }} & {{ form.groom_name }}
            </span>
          </div>
          <div v-if="form.event_start_date" class="flex items-center gap-2">
            <i class="i-solar-calendar-date-bold-duotone text-blue-600"></i>
            <span class="text-blue-800">
              Event: {{ formatDate(form.event_start_date) }} - {{ formatDate(form.event_end_date) }}
            </span>
          </div>
          <div v-if="form.rsvp_deadline_date" class="flex items-center gap-2">
            <i class="i-solar-calendar-check-bold-duotone text-blue-600"></i>
            <span class="text-blue-800">
              RSVP Deadline: {{ formatDate(form.rsvp_deadline_date) }}
            </span>
          </div>
        </div>
      </template>
    </Card>
  </AdminPageWrapper>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { fetchMainSettings, updateMainSettings, validateMainSettings } from '@/api/settings'
import { useToastService } from '@/utils/toastService'
import { formatDateWithoutTime } from '@/utils/dateFormatter'
import { useErrorHandler } from '@/composables/useErrorHandler'

const { showSuccess } = useToastService()
const { handleError } = useErrorHandler({ showToast: true })

const form = ref({
  enable_global_countdown: false,
  wedding_date: '',
  venue_name: '',
  venue_address: '',
  event_start_date: '',
  event_end_date: '',
  event_time: '',
  bride_name: '',
  groom_name: '',
  contact_email: '',
  contact_phone: '',
  event_type: '',
  dress_code: '',
  special_instructions: '',
  website_url: '',
  app_title: ''
})

const dateValue = ref(null)
const eventStartDate = ref(null)
const eventEndDate = ref(null)
const saving = ref(false)

const eventTypeOptions = [
  { label: 'Wedding Ceremony', value: 'wedding-ceremony' },
  { label: 'Wedding Reception', value: 'wedding-reception' },
  { label: 'Wedding Ceremony & Reception', value: 'wedding-ceremony-reception' },
  { label: 'Engagement Party', value: 'engagement-party' },
  { label: 'Rehearsal Dinner', value: 'rehearsal-dinner' },
  { label: 'Other', value: 'other' }
]

onMounted(async () => {
  await loadSettings()
})

async function loadSettings() {
  try {
    const settings = await fetchMainSettings()
    form.value = {
      enable_global_countdown: settings.enableGlobalCountdown || false,
      wedding_date: settings.weddingDate || '',
      venue_name: settings.venueName || '',
      venue_address: settings.venueAddress || '',
      event_start_date: settings.eventStartDate || '',
      event_end_date: settings.eventEndDate || '',
      event_time: settings.eventTime || '',
      bride_name: settings.brideName || '',
      groom_name: settings.groomName || '',
      contact_email: settings.contactEmail || '',
      contact_phone: settings.contactPhone || '',
      event_type: settings.eventType || '',
      dress_code: settings.dressCode || '',
      special_instructions: settings.specialInstructions || '',
      website_url: settings.websiteUrl || '',
      app_title: settings.appTitle || ''
    }
    
    if (settings.weddingDate) {
      dateValue.value = new Date(settings.weddingDate)
    } else {
      dateValue.value = null
    }

    if (settings.eventStartDate) {
      eventStartDate.value = new Date(settings.eventStartDate)
    } else {
      eventStartDate.value = null
    }

    if (settings.eventEndDate) {
      eventEndDate.value = new Date(settings.eventEndDate)
    } else {
      eventEndDate.value = null
    }


  } catch (error) {
    handleError(error, 'Failed to load main settings')
  }
}

async function saveSettings() {
  // Validate settings
  const validation = validateMainSettings(form.value)
  if (!validation.isValid) {
    handleError(new Error(validation.errors.join(', ')), 'Validation Error')
    return
  }

  try {
    saving.value = true
    await updateMainSettings(form.value)
    showSuccess('Success', 'Main settings saved successfully', 5000)
  } catch (error) {
    handleError(error, 'Failed to save main settings')
  } finally {
    saving.value = false
  }
}

function resetSettings() {
  loadSettings()
}

// Use centralized date formatter utility
function formatWeddingDate(dateString) {
  if (!dateString) return 'Not set'
  return formatDateWithoutTime(dateString)
}

function formatDate(dateString) {
  if (!dateString) return 'Not set'
  return formatDateWithoutTime(dateString)
}

// Watch for date picker changes
watch(dateValue, (newValue) => {
  if (newValue) {
    const year = newValue.getFullYear()
    const month = String(newValue.getMonth() + 1).padStart(2, '0')
    const day = String(newValue.getDate()).padStart(2, '0')
    form.value.wedding_date = `${year}-${month}-${day}`
  } else {
    form.value.wedding_date = ''
  }
})

watch(eventStartDate, (newValue) => {
  if (newValue) {
    const year = newValue.getFullYear()
    const month = String(newValue.getMonth() + 1).padStart(2, '0')
    const day = String(newValue.getDate()).padStart(2, '0')
    form.value.event_start_date = `${year}-${month}-${day}`
  } else {
    form.value.event_start_date = ''
  }
})

watch(eventEndDate, (newValue) => {
  if (newValue) {
    const year = newValue.getFullYear()
    const month = String(newValue.getMonth() + 1).padStart(2, '0')
    const day = String(newValue.getDate()).padStart(2, '0')
    form.value.event_end_date = `${year}-${month}-${day}`
  } else {
    form.value.event_end_date = ''
  }
})


</script>

<style scoped>
/* Scoped styles for Main Settings */
</style>