<template>
  <AdminPageWrapper 
    title="Main Settings" 
    description="Configure global site settings and wedding information"
  >
    <Card>
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

          <!-- Current Settings Display -->
          <div class="p-4 bg-blue-50 rounded-lg">
            <h4 class="font-medium text-blue-900 mb-2">Current Settings</h4>
            <div class="space-y-1 text-sm">
              <div class="flex items-center gap-2">
                <i class="pi pi-calendar text-blue-600"></i>
                <span class="text-blue-800">
                  Countdown: 
                  <span :class="form.enable_global_countdown ? 'text-green-600 font-medium' : 'text-red-600 font-medium'">
                    {{ form.enable_global_countdown ? 'Enabled' : 'Disabled' }}
                  </span>
                </span>
              </div>
              <div v-if="form.wedding_date" class="flex items-center gap-2">
                <i class="pi pi-heart text-blue-600"></i>
                <span class="text-blue-800">
                  Wedding Date: {{ formatWeddingDate(form.wedding_date) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 pt-4 border-t">
            <Button
              label="Save Settings"
              icon="pi pi-save"
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
import { useToast } from 'primevue/usetoast'
import { fetchMainSettings, updateMainSettings, validateMainSettings } from '@/api/settings'

const toast = useToast()

const form = ref({
  enable_global_countdown: false,
  wedding_date: ''
})

const dateValue = ref(null)
const saving = ref(false)

onMounted(async () => {
  await loadSettings()
})

async function loadSettings() {
  try {
    const settings = await fetchMainSettings()
    form.value = {
      enable_global_countdown: settings.enableGlobalCountdown || false,
      wedding_date: settings.weddingDate || ''
    }
    
    if (settings.weddingDate) {
      dateValue.value = new Date(settings.weddingDate)
    } else {
      dateValue.value = null
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load main settings',
      life: 5000
    })
  }
}

async function saveSettings() {
  // Validate settings
  const validation = validateMainSettings(form.value)
  if (!validation.isValid) {
    toast.add({
      severity: 'error',
      summary: 'Validation Error',
      detail: validation.errors.join(', '),
      life: 5000
    })
    return
  }

  try {
    saving.value = true
    await updateMainSettings(form.value)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Main settings saved successfully',
      life: 5000
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save main settings',
      life: 5000
    })
  } finally {
    saving.value = false
  }
}

function resetSettings() {
  loadSettings()
}

function formatWeddingDate(dateString) {
  if (!dateString) return 'Not set'
  const date = new Date(dateString)
  return date.toLocaleDateString()
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
    
    form.value.wedding_date = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } else {
    form.value.wedding_date = ''
  }
})
</script>

<style scoped>
/* Scoped styles for Main Settings */
</style>