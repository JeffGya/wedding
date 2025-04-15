<template>
  <div class="p-6">
    <h1 class="text-4xl font-bold text-gray-800 mb-6 text-center">Settings</h1>
    <p class="text-gray-600 text-center mb-8">Manage site-wide settings such as email templates, contact info, and visibility options.</p>

    <!-- Tab Navigation -->
    <div class="flex justify-center mb-6 space-x-4">
      <button
        class="px-4 py-2 rounded border border-gray-300"
        :class="activeTab === 'main' ? 'bg-gray-200 font-semibold' : 'bg-white'"
        @click="activateTab('')"
      >
        Main
      </button>
      <button
        class="px-4 py-2 rounded border border-gray-300"
        :class="activeTab === 'email' ? 'bg-gray-200 font-semibold' : 'bg-white'"
        @click="activateTab('email')"
      >
        Email
      </button>
      <!-- Future tabs can be added here -->
    </div>

    <!-- Tab Content -->
    <div>
      <div v-if="activeTab === 'main'">
        <!-- Placeholder for main settings form or content -->
      </div>
      <EmailSettings v-if="activeTab === 'email'" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmailSettings from './settings/EmailSettings.vue'

const route = useRoute()
const router = useRouter()
const activeTab = ref('main')

// Navigate to current tab route when switching tabs
function activateTab(tab) {
  activeTab.value = tab
  router.push(`/admin/settings/${tab}`)
}

onMounted(() => {
  const tabFromRoute = route.path.split('/').pop()
  if (tabFromRoute) activeTab.value = tabFromRoute
})
</script>
