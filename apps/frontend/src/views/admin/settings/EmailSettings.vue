<template>
  <Card class="max-w-2xl mx-auto mt-6">
    <template #content>
    <Form @submit="saveSettings" class="space-y-4">
      <FloatLabel variant="in">
        <Select
          id="provider"
          v-model="form.provider"
          :options="[{ label: 'Resend', value: 'resend' }]"
          optionLabel="label"
          optionValue="value"
          class="w-full"
        />
        <label for="provider">Provider</label>
      </FloatLabel>

      <FloatLabel variant="in">
        <InputText
          id="api_key"
          v-model="form.api_key"
          class="w-full"
        />
        <label for="api_key">API Key</label>
      </FloatLabel>

      <FloatLabel variant="in">
        <InputText
          id="from_name"
          v-model="form.from_name"
          class="w-full"
        />
        <label for="from_name">From Name</label>
      </FloatLabel>

      <FloatLabel variant="in">
        <InputText
          id="from_email"
          v-model="form.from_email"
          class="w-full"
        />
        <label for="from_email">From Email</label>
      </FloatLabel>

      <FloatLabel variant="in">
        <InputText
          id="sender_name"
          v-model="form.sender_name"
          class="w-full"
        />
        <label for="sender_name">Sender Name</label>
      </FloatLabel>

      <FloatLabel variant="in">
        <InputText
          id="sender_email"
          v-model="form.sender_email"
          class="w-full"
        />
        <label for="sender_email">Sender Email</label>
      </FloatLabel>

      <div class="flex items-center">
        <ToggleSwitch
          id="enabled"
          v-model="form.enabled"
          onLabel="Yes"
          offLabel="No"
          class="mr-2"
        />
        <label for="enabled" class="font-medium">Enable Email Sending</label>
      </div>

      <Button label="Save Email Settings" type="submit" class="p-button-primary" />
      <p v-if="message" class="text-green-600 mt-4">{{ message }}</p>
    </Form>
    </template>
  </Card>
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
