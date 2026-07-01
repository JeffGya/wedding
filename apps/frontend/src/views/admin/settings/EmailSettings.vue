<template>
  <div>
    <SettingsSection title="Email Provider">
      <form @submit.prevent="saveSettings" class="space-y-6">
        <FieldError :errors="validationErrors" />

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
          <p class="text-sm text-[#7A6B55] mt-1">Choose your email service provider</p>
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
          <p class="text-sm text-[#7A6B55] mt-1">Your provider's API key for sending emails</p>
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
          <p class="text-sm text-[#7A6B55] mt-1">Display name that appears in the "From" field</p>
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
          <p class="text-sm text-[#7A6B55] mt-1">Email address that appears in the "From" field</p>
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
          <p class="text-sm text-[#7A6B55] mt-1">Alternative sender name for specific messages</p>
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
          <p class="text-sm text-[#7A6B55] mt-1">Alternative email address for specific messages</p>
        </div>

        <!-- Enable Email Sending -->
        <div class="flex items-center gap-3 p-4 bg-form-bg border border-form-border rounded-lg">
          <ToggleSwitch
            id="enabled"
            v-model="form.enabled"
          />
          <div>
            <label for="enabled" class="block text-sm font-medium text-txt">Enable Email Sending</label>
            <p class="text-sm text-[#7A6B55]">Allow the system to send emails to guests</p>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 pt-4 border-t border-form-border">
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
    </SettingsSection>

    <!-- Test Email Modal -->
    <TestEmailModal
      v-model:visible="showTestEmailModal"
      @close="showTestEmailModal = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { fetchEmailSettings, updateEmailSettings, validateEmailSettings } from '@/api/settings'
import { useToastService } from '@/utils/toastService'
import TestEmailModal from '@/components/TestEmailModal.vue'
import FieldError from '@/components/ui/FieldError.vue'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import { useLoading } from '@/composables/useLoading'
import { useErrorHandler } from '@/composables/useErrorHandler'

const { showSuccess, showWarning, showInfo } = useToastService()
const { loading } = useLoading()
const { handleError } = useErrorHandler({ showToast: true })

const validationErrors = ref([])
const isDirty = ref(false)
const suppressDirty = ref(true)

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
const showTestEmailModal = ref(false)

onMounted(async () => {
  await loadSettings()
  await nextTick()
  suppressDirty.value = false
  watch(form, () => {
    if (suppressDirty.value) return
    isDirty.value = true
  }, { deep: true })
})

async function loadSettings() {
  loading.value = true
  try {
    const settings = await fetchEmailSettings()
    
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
    }
  } catch (error) {
    handleError(error, 'Failed to load email settings')
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  // Validate settings
  const validation = validateEmailSettings(form.value)
  if (!validation.isValid) {
    validationErrors.value = validation.errors
    return
  }
  validationErrors.value = []

  try {
    saving.value = true
    await updateEmailSettings(form.value)
    showSuccess('Success', 'Email settings saved successfully', 5000)
    isDirty.value = false
  } catch (error) {
    handleError(error, 'Failed to save email settings')
  } finally {
    saving.value = false
  }
}

async function resetSettings() {
  suppressDirty.value = true
  await loadSettings()
  await nextTick()
  suppressDirty.value = false
  validationErrors.value = []
  isDirty.value = false
}

defineExpose({ isDirty, save: saveSettings, reset: resetSettings })

async function testConfiguration() {
  showTestEmailModal.value = true
}
</script>

<style scoped>
/* Optional scoped styling can go here */
</style>
