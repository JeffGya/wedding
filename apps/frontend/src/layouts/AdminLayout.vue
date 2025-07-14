<template>
  <div class="flex">
    <aside class="hidden md:block basis-3xs p-8 pt-24 space-y-4 mr-24">
      <Menu :model="menuItems" />
    </aside>

    <div class="flex-1">
      <div class="md:hidden mt-16">
        <Menubar :model="menuItems" />
      </div>
      <!-- Main Content -->
      <main class="basis-full mb-40 md:pl-0 pl-0">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import Menu from 'primevue/menu';
import Menubar from 'primevue/menubar';
import { useRouter } from 'vue-router';
const router = useRouter();

const showMenu = ref(false);
const toggleMenu = () => {
  showMenu.value = !showMenu.value;
};

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
    label: 'Media',
    icon: 'i-solar:gallery-minimalistic-bold-duotone',
    command: () => router.push('/admin/media')
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
