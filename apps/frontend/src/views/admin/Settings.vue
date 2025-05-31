<template>
  <div class>
    <h1 class="text-4xl font-semibold mb-8 text-center">Settings</h1>
    <p class="text-center mb-8">Manage site-wide settings such as email templates, contact info, and visibility options.</p>

    <!-- Tab Navigation -->
    <div class="flex justify-center mb-8 m-auto">
      <SelectButton
        v-model="activeTab"
        :options="tabOptions"
        optionLabel="label"
        optionValue="value"
        class="w-full max-w-xs"
      />
    </div>

    <!-- Tab Content -->
    <div>
      <div v-if="activeTab === 'main'">
        <MainSettings />
      </div>
      <EmailSettings v-if="activeTab === 'email'" />
      <GuestSettings v-if="activeTab === 'guests'" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import EmailSettings from './settings/EmailSettings.vue'
import GuestSettings from './settings/GuestSettings.vue'
import MainSettings from './settings/MainSettings.vue'
import SelectButton from 'primevue/selectbutton';

const activeTab = ref('main')

const tabOptions = [
  { label: 'Main', value: 'main' },
  { label: 'Email', value: 'email' },
  { label: 'Guests', value: 'guests' }
]

// Navigate to current tab route when switching tabs
function activateTab(tab) {
  activeTab.value = tab
}
</script>
