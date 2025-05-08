<template>
  <div class="flex min-h-screen bg-gray-100">
    <!-- Sidebar -->
    <aside class="w-64 bg-white shadow-md p-4 space-y-4">
      <h2 class="text-xl font-semibold mb-4">Admin Panel</h2>
      <nav class="space-y-2">
        <ul class="space-y-1">
          <li><RouterLink to="/admin/overview" :class="['hover:underline', $route.path === '/admin/overview' ? 'text-black font-bold' : 'text-blue-600']">Overview</RouterLink></li>
          <li><RouterLink to="/admin/pages" :class="['hover:underline', $route.path === '/admin/pages' ? 'text-black font-bold' : 'text-blue-600']">Pages</RouterLink></li>
          <li>
            <button @click="toggleGuests" class="w-full text-left text-blue-600 hover:underline">
              Guests
            </button>
            <ul v-show="showGuests" class="pl-4 mt-1 space-y-1">
              <li><RouterLink to="/admin/guests/overview" :class="['hover:underline', $route.path === '/admin/guests/overview' ? 'text-black font-bold' : 'text-blue-600']">Overview</RouterLink></li>
              <li><RouterLink to="/admin/guests/rsvps" :class="['hover:underline', $route.path === '/admin/guests/rsvps' ? 'text-black font-bold' : 'text-blue-600']">RSVPs</RouterLink></li>
              <li><RouterLink to="/admin/guests/messages" :class="['hover:underline', $route.path === '/admin/guests/messages' ? 'text-black font-bold' : 'text-blue-600']">Messages</RouterLink></li>
            </ul>
          </li>
          <li><RouterLink to="/admin/settings" :class="['hover:underline', $route.path === '/admin/settings' ? 'text-black font-bold' : 'text-blue-600']">Settings</RouterLink></li>
          <li>
            <RouterLink to="/admin/settings/email"
              :class="['hover:underline', $route.path === '/admin/settings/email' ? 'text-black font-bold' : 'text-blue-600']">
              Email Settings
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/admin/settings/guests"
              :class="['hover:underline', $route.path === '/admin/settings/guests' ? 'text-black font-bold' : 'text-blue-600']">
              Guest Settings
            </RouterLink>
          </li>
        </ul>
      </nav>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 p-6">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const showGuests = ref(false)
const toggleGuests = () => {
  showGuests.value = !showGuests.value
}
</script>
