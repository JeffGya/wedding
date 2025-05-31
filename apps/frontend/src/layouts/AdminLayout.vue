<template>
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    <aside class="w-64 p-8 space-y-4">
      <Menu :model="menuItems" class="p-menu-vertical" />
    </aside>

    <!-- Main Content -->
    <main class="flex-1 p-16">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Menu from 'primevue/menu';
import { useRouter } from 'vue-router';
const router = useRouter();

const showGuests = ref(false)
const toggleGuests = () => {
  showGuests.value = !showGuests.value
}

const menuItems = [
  {
    label: 'Overview',
    icon: 'i-solar:home-2-bold-duotone',
    command: () => router.push('/admin/overview')
  },
  {
    label: 'Pages',
    icon: 'i-solar:documents-minimalistic-bold-duotone',
    command: () => router.push('/admin/pages')
  },
  {
    label: 'Guests',
    items: [
      {
        label: 'Guest Management',
        icon: 'i-solar:users-group-two-rounded-bold-duotone',
        command: () => router.push('/admin/guests/overview')
      },
      {
        label: 'RSVPs',
        icon: 'i-solar:check-read-bold-duotone',
        command: () => router.push('/admin/guests/rsvps')
      },
      {
        label: 'Messages',
        icon: 'i-solar:inbox-archive-bold-duotone',
        command: () => router.push('/admin/guests/messages')
      }
    ]
  },
  {
    label: 'Settings',
    icon: 'i-solar:settings-bold-duotone',
    command: () => router.push('/admin/settings')
  }
];

// Script setup auto-registers imports, no explicit registration needed
</script>
