<template>
  <AdminPageWrapper 
    title="Settings" 
    description="Manage site-wide settings such as email templates, contact info, and visibility options"
  >
    <!-- Tab Navigation -->
    <Card>
      <template #content>
        <div class="flex justify-center mb-6">
          <SelectButton
            v-model="activeTab"
            :options="tabOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full max-w-md"
          />
        </div>

        <!-- Tab Content -->
        <div class="mt-6">
          <Transition name="fade" mode="out-in">
            <div v-if="activeTab === 'main'" key="main">
              <MainSettings />
            </div>
            <div v-else-if="activeTab === 'email'" key="email">
              <EmailSettings />
            </div>
            <div v-else-if="activeTab === 'guests'" key="guests">
              <GuestSettings />
            </div>
          </Transition>
        </div>
      </template>
    </Card>
  </AdminPageWrapper>
</template>

<script setup>
import { ref } from 'vue'
import AdminPageWrapper from '@/components/AdminPageWrapper.vue'
import EmailSettings from './settings/EmailSettings.vue'
import GuestSettings from './settings/GuestSettings.vue'
import MainSettings from './settings/MainSettings.vue'
import SelectButton from 'primevue/selectbutton'
import Card from 'primevue/card'

const activeTab = ref('main')

const tabOptions = [
  { label: 'Main Settings', value: 'main' },
  { label: 'Email Settings', value: 'email' },
  { label: 'Guest Settings', value: 'guests' }
]
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
