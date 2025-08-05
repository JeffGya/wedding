<template>
  <div class="admin-layout">
    <!-- Mobile Header with Menu Toggle -->
    <header class="mobile-header md:hidden">
      <div class="flex items-center justify-between p-4 bg-card-bg border-b border-form-border">
        <h1 class="text-xl font-semibold text-text">Admin Dashboard</h1>
        <Button 
          icon="pi pi-bars" 
          severity="secondary" 
          text 
          @click="toggleMobileMenu"
          aria-label="Toggle menu"
        />
      </div>
    </header>

    <div class="flex h-screen">
      <!-- Sidebar -->
      <aside 
        :class="[
          'sidebar bg-card-bg border-r border-form-border transition-transform duration-300 ease-in-out',
          'fixed md:relative z-50 h-full',
          'w-64 transform',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        ]"
      >
        <!-- Desktop Header -->
        <div class="hidden md:block p-6 border-b border-form-border">
          <h1 class="text-xl font-semibold text-text">Admin Dashboard</h1>
        </div>

        <!-- Navigation Menu -->
        <nav class="p-4">
          <Menu 
            :model="menuItems" 
            class="w-full border-none"
          />
        </nav>
      </aside>

      <!-- Mobile Overlay -->
      <div 
        v-if="mobileMenuOpen" 
        class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
        @click="closeMobileMenu"
      />

      <!-- Main Content Area -->
      <main class="flex-1 flex flex-col overflow-hidden">
        <!-- Content Wrapper -->
        <div class="flex-1 overflow-auto p-4 md:p-6">
          <router-view />
        </div>
      </main>
    </div>

    <!-- Global Toast for all admin pages -->
    <Toast />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Menu from 'primevue/menu';
import Button from 'primevue/button';
import { useRouter } from 'vue-router';

const router = useRouter();
const mobileMenuOpen = ref(false);

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};

const closeMobileMenu = () => {
  mobileMenuOpen.value = false;
};

// Close mobile menu on route change
const handleRouteChange = () => {
  if (mobileMenuOpen.value) {
    mobileMenuOpen.value = false;
  }
};

onMounted(() => {
  router.afterEach(handleRouteChange);
});

onUnmounted(() => {
  // Clean up if needed
});

const menuItems = [
  {
    label: 'Overview',
    icon: 'pi pi-home',
    command: () => router.push('/admin/overview')
  },
  {
    label: 'Media',
    icon: 'pi pi-images',
    command: () => router.push('/admin/media')
  },
  {
    label: 'Guests Management',
    icon: 'pi pi-users',
    items: [
      {
        label: 'Guests',
        icon: 'pi pi-user',
        command: () => router.push('/admin/guests/overview')
      },
      {
        label: 'RSVPs',
        icon: 'pi pi-check-circle',
        command: () => router.push('/admin/guests/rsvps')
      },
      {
        label: 'Messages',
        icon: 'pi pi-inbox',
        command: () => router.push('/admin/guests/messages')
      }
    ]
  },
  {
    label: 'Pages & Surveys',
    icon: 'pi pi-file',
    items: [
      {
        label: 'Pages',
        icon: 'pi pi-file-edit',
        command: () => router.push('/admin/pages')
      },
      {
        label: 'Surveys',
        icon: 'pi pi-list',
        command: () => router.push('/admin/surveys')
      }
    ]
  },
  {
    label: 'Settings',
    icon: 'pi pi-cog',
    command: () => router.push('/admin/settings')
  }
];
</script>

<style scoped>
.admin-layout {
  @apply h-screen bg-bg-color;
}

.sidebar {
  @apply shadow-lg md:shadow-none;
}

/* Custom scrollbar for main content */
.main-content::-webkit-scrollbar {
  width: 6px;
}

.main-content::-webkit-scrollbar-track {
  @apply bg-form-background;
}

.main-content::-webkit-scrollbar-thumb {
  @apply bg-form-border rounded;
}

.main-content::-webkit-scrollbar-thumb:hover {
  @apply bg-form-border-hover;
}
</style>
