<template>
  <div 
    class="admin mx-24 md:mx-40 md:mt-40 md:flex md:flex-row gap-16"
  >
    <aside class="hidden md:flex p-16 md:flex-none md:h-full">
      <Menu 
        :model="menuItems" 
      />
    </aside>

    <div class="flex flex-col gap-16 md:grow md:flex-auto">
      <div class="md:hidden mt-16">
        <Menubar 
          :model="menuItems" 
          />
      </div>
      <!-- Main Content -->
      <main 
        class="admin-main basis-full mb-40 md:pl-0 pl-0"
      >
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
    label: 'Media',
    icon: 'i-solar:gallery-minimalistic-bold-duotone',
    command: () => router.push('/admin/media')
  },
  {
    label: 'Guests Management',
    items: [
      {
        label: 'Guests',
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
    label: 'Pages & Surveys',
    items: [
      {
        label: 'Pages',
        icon: 'i-solar:documents-minimalistic-bold-duotone',
        command: () => router.push('/admin/pages')
      },
      {
        label: 'Surveys',
        icon: 'i-solar:letter-opened-bold',
        command: () => router.push('/admin/surveys')
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
