<template>
  <AdminPageWrapper 
    title="Email Settings" 
    description="Configure email provider settings for sending messages to guests"
  >
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
import { ref, onMounted } from 'vue'
import AdminPageWrapper from '@/components/AdminPageWrapper.vue'
import { fetchEmailSettings, updateEmailSettings, validateEmailSettings } from '@/api/settings'
import { useToastService } from '@/utils/toastService'
import TestEmailModal from '@/components/TestEmailModal.vue'

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

onMounted(async () => {
  await loadSettings()
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
</script>

<style scoped>
/* Optional scoped styling can go here */
</style>
