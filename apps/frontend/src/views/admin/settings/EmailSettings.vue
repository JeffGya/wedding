<template>
  <AdminPageWrapper 
    title="Email Settings" 
    description="Configure email provider settings for sending messages to guests"
  >
    <!-- Quota Status Card -->
    <Card v-if="quotaStatus" class="mb-6">
      <template #content>
        <div class="space-y-4">
          <h3 class="text-lg font-semibold mb-4">Resend Quota Status</h3>
          
          <!-- Daily Quota -->
          <div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-medium">Daily Quota</span>
              <span :class="getQuotaPercentage(quotaStatus.daily) >= 80 ? 'text-orange-600' : 'text-gray-600'" class="text-sm font-semibold">
                {{ quotaStatus.daily.sent }} / {{ quotaStatus.daily.limit }} emails
              </span>
            </div>
            <ProgressBar 
              :value="getQuotaPercentage(quotaStatus.daily)" 
              :class="['h-2', getQuotaBarClass(quotaStatus.daily)]"
            />
            <p class="text-xs text-gray-500 mt-1">
              Resets at {{ formatResetTime(quotaStatus.daily.resetsAt) }}
            </p>
          </div>

          <!-- Monthly Quota -->
          <div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-sm font-medium">Monthly Quota</span>
              <span :class="getQuotaPercentage(quotaStatus.monthly) >= 80 ? 'text-orange-600' : 'text-gray-600'" class="text-sm font-semibold">
                {{ quotaStatus.monthly.sent }} / {{ quotaStatus.monthly.limit }} emails
              </span>
            </div>
            <ProgressBar 
              :value="getQuotaPercentage(quotaStatus.monthly)" 
              :class="['h-2', getQuotaBarClass(quotaStatus.monthly)]"
            />
            <p class="text-xs text-gray-500 mt-1">
              Resets on {{ formatResetTime(quotaStatus.monthly.resetsAt) }}
            </p>
          </div>

          <!-- Queue Status -->
          <div v-if="quotaStatus.queue && quotaStatus.queue.length > 0" class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div class="flex items-center gap-2">
              <i class="i-solar:clock-circle-bold text-yellow-600"></i>
              <div>
                <p class="text-sm font-medium text-yellow-800">
                  {{ quotaStatus.queue.length }} message(s) queued
                </p>
                <p v-if="quotaStatus.queue.validUntil" class="text-xs text-yellow-600">
                  Will be sent after {{ formatResetTime(quotaStatus.queue.validUntil) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <Card>
      <template #content>
        <form @submit.prevent="saveSettings" class="space-y-6">
          <!-- Provider Selection -->
          <div>
            <FloatLabel variant="in">
              <Select
                id="provider"
                v-model="form.provider"
                :options="providerOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                placeholder="Select email provider"
              />
              <label for="provider">Email Provider</label>
            </FloatLabel>
            <p class="text-sm text-gray-600 mt-1">Choose your email service provider</p>
          </div>

          <!-- API Key -->
          <div>
            <FloatLabel variant="in">
              <Password
                id="api_key"
                v-model="form.api_key"
                class="w-full"
                placeholder="Enter your API key"
                :feedback="false"
                toggleMask
              />
              <label for="api_key">API Key</label>
            </FloatLabel>
            <p class="text-sm text-gray-600 mt-1">Your provider's API key for sending emails</p>
          </div>

          <!-- From Name -->
          <div>
            <FloatLabel variant="in">
              <InputText
                id="from_name"
                v-model="form.from_name"
                class="w-full"
                placeholder="Enter sender display name"
              />
              <label for="from_name">From Name</label>
            </FloatLabel>
            <p class="text-sm text-gray-600 mt-1">Display name that appears in the "From" field</p>
          </div>

          <!-- From Email -->
          <div>
            <FloatLabel variant="in">
              <InputText
                id="from_email"
                v-model="form.from_email"
                class="w-full"
                placeholder="sender@example.com"
                type="email"
              />
              <label for="from_email">From Email</label>
            </FloatLabel>
            <p class="text-sm text-gray-600 mt-1">Email address that appears in the "From" field</p>
          </div>

          <!-- Sender Name (Optional) -->
          <div>
            <FloatLabel variant="in">
              <InputText
                id="sender_name"
                v-model="form.sender_name"
                class="w-full"
                placeholder="Enter alternative sender name (optional)"
              />
              <label for="sender_name">Sender Name (Optional)</label>
            </FloatLabel>
            <p class="text-sm text-gray-600 mt-1">Alternative sender name for specific messages</p>
          </div>

          <!-- Sender Email (Optional) -->
          <div>
            <FloatLabel variant="in">
              <InputText
                id="sender_email"
                v-model="form.sender_email"
                class="w-full"
                placeholder="alternative@example.com"
                type="email"
              />
              <label for="sender_email">Sender Email (Optional)</label>
            </FloatLabel>
            <p class="text-sm text-gray-600 mt-1">Alternative email address for specific messages</p>
          </div>

          <!-- Enable Email Sending -->
          <div class="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <ToggleSwitch
              id="enabled"
              v-model="form.enabled"
            />
            <div>
              <label for="enabled" class="block text-sm font-medium">Enable Email Sending</label>
              <p class="text-sm text-gray-600">Allow the system to send emails to guests</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 pt-4 border-t">
            <Button
              label="Test Configuration"
              icon="pi pi-send"
              severity="secondary"
              outlined
              @click="testConfiguration"
              :loading="testing"
            />
            <Button
              label="Save Settings"
              icon="i-solar:diskette-bold"
              type="submit"
              :loading="saving"
            />
          </div>
        </form>
      </template>
    </Card>

    <!-- Test Email Modal -->
    <TestEmailModal
      v-model:visible="showTestEmailModal"
      @close="showTestEmailModal = false"
    />
  </AdminPageWrapper>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import AdminPageWrapper from '@/components/AdminPageWrapper.vue'
import { fetchEmailSettings, updateEmailSettings, validateEmailSettings, fetchQuotaStatus } from '@/api/settings'
import { useToastService } from '@/utils/toastService'
import TestEmailModal from '@/components/TestEmailModal.vue'
import ProgressBar from 'primevue/progressbar'
import Card from 'primevue/card'

const { showSuccess, showError, showWarning, showInfo } = useToastService()

const form = ref({
  provider: 'resend',
  api_key: '',
  from_name: '',
  from_email: '',
  sender_name: '',
  sender_email: '',
  enabled: false
})

const providerOptions = [
  { label: 'Resend', value: 'resend' }
]

const saving = ref(false)
const testing = ref(false)
const loading = ref(true)
const showTestEmailModal = ref(false)
const quotaStatus = ref(null)
let quotaRefreshInterval = null

onMounted(async () => {
  await loadSettings()
  await loadQuotaStatus()
  // Auto-refresh quota every 30 seconds
  quotaRefreshInterval = setInterval(async () => {
    await loadQuotaStatus()
  }, 30000)
})

onUnmounted(() => {
  if (quotaRefreshInterval) {
    clearInterval(quotaRefreshInterval)
  }
})

async function loadSettings() {
  try {
    loading.value = true
    console.log('Loading email settings...')
    const settings = await fetchEmailSettings()
    console.log('Received settings:', settings)
    
    // Handle both null response and actual settings
    if (settings) {
      form.value = {
        provider: settings.provider || 'resend',
        api_key: settings.api_key || '',
        from_name: settings.from_name || '',
        from_email: settings.from_email || '',
        sender_name: settings.sender_name || '',
        sender_email: settings.sender_email || '',
        enabled: settings.enabled || false
      }
      console.log('Form populated with:', form.value)
    } else {
      console.log('No settings found, using defaults')
      // Keep the default values
    }
  } catch (error) {
    console.error('Error loading settings:', error)
    showError('Error', 'Failed to load email settings', 5000)
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  // Validate settings
  const validation = validateEmailSettings(form.value)
  if (!validation.isValid) {
    showError('Validation Error', validation.errors.join(', '), 5000)
    return
  }

  try {
    saving.value = true
    console.log('Saving settings:', form.value)
    await updateEmailSettings(form.value)
    showSuccess('Success', 'Email settings saved successfully', 5000)
  } catch (error) {
    console.error('Error saving settings:', error)
    showError('Error', 'Failed to save email settings', 5000)
  } finally {
    saving.value = false
  }
}

async function testConfiguration() {
  showTestEmailModal.value = true
}

async function loadQuotaStatus() {
  try {
    const status = await fetchQuotaStatus()
    quotaStatus.value = status
  } catch (error) {
    console.error('Error loading quota status:', error)
    // Don't show error toast for quota - it's not critical
  }
}

function getQuotaPercentage(quota) {
  if (!quota || quota.limit === 0) return 0
  return Math.min(100, Math.round((quota.sent / quota.limit) * 100))
}

function getQuotaBarClass(quota) {
  const percentage = getQuotaPercentage(quota)
  if (percentage >= 100) return 'bg-red-500'
  if (percentage >= 80) return 'bg-orange-500'
  return 'bg-green-500'
}

function formatResetTime(isoString) {
  if (!isoString) return 'N/A'
  try {
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  } catch (error) {
    return isoString
  }
}
</script>

<style scoped>
/* Optional scoped styling can go here */
</style>
