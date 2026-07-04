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
      <!-- Sidebar (floating full-height card) -->
      <aside
        :class="[
          'sidebar transition-transform duration-300 ease-in-out',
          'fixed md:relative z-50 h-full md:h-auto',
          'w-64 transform flex flex-col overflow-y-auto',
          'bg-card-bg md:m-16 rounded-[12px]',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        ]"
      >
        <!-- Desktop Header -->
        <div class="hidden md:block px-5 pt-5 pb-4 border-b border-form-border">
          <h1 class="font-serif text-[19px] font-semibold text-text">Admin Dashboard</h1>
        </div>

        <!-- Navigation Menu -->
        <Menu
          :model="menuItems"
          class="admin-nav w-full border-none"
        >
          <template #item="{ item }">
            <a
              class="admin-nav-item"
              :class="{ 'admin-nav-item--active': isActive(item) }"
              @click="item.command"
            >
              <span class="admin-nav-dot"></span>
              <span class="admin-nav-label">{{ item.label }}</span>
            </a>
          </template>
        </Menu>
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
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Menu from 'primevue/menu';
import Button from 'primevue/button';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const mobileMenuOpen = ref(false);

function isActive(item) {
  const p = route.path;
  // Guests must NOT light up when on the Messages sub-path
  if (item.path === '/admin/guests') {
    return p === '/admin/guests' ||
      (p.startsWith('/admin/guests') && !p.startsWith('/admin/guests/messages'));
  }
  return p.startsWith(item.path);
}

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
    path: '/admin/overview',
    command: () => router.push('/admin/overview')
  },
  {
    label: 'Guests',
    path: '/admin/guests',
    command: () => router.push('/admin/guests')
  },
  {
    label: 'Messages',
    path: '/admin/guests/messages',
    command: () => router.push('/admin/guests/messages')
  },
  {
    label: 'Templates',
    path: '/admin/templates',
    command: () => router.push('/admin/templates')
  },
  {
    label: 'Surveys',
    path: '/admin/surveys',
    command: () => router.push('/admin/surveys')
  },
  {
    label: 'Pages',
    path: '/admin/pages',
    command: () => router.push('/admin/pages')
  },
  {
    label: 'Media',
    path: '/admin/media',
    command: () => router.push('/admin/media')
  },
  {
    label: 'Settings',
    path: '/admin/settings',
    command: () => router.push('/admin/settings')
  }
];
</script>

<style scoped>
.admin-layout {
  @apply h-screen bg-bg-color;
}

.sidebar {
  @apply shadow-lg;
}

@media (min-width: 768px) {
  .sidebar {
    box-shadow: 0 4px 16px rgba(68, 39, 39, 0.18);
  }
}

/* Navigation list container spacing (matches design: padding 14px 10px, gap 2px) */
.admin-nav {
  padding: 14px 10px;
}

/* Neutralize PrimeVue's own item wrapper so .admin-nav-item owns all
 * padding / background / hover — the #item slot content lives inside
 * .p-menu-item-content, which has its own default padding + focus bg. */
.admin-nav :deep(.p-menu-list) {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin-nav :deep(.p-menu-item-content),
.admin-nav :deep(.p-menu-item) {
  padding: 0;
  border-radius: 8px;
  background: transparent;
}

.admin-nav :deep(.p-menu-item-content:hover),
.admin-nav :deep(.p-menu-item.p-focus > .p-menu-item-content) {
  background: transparent;
}

/* Custom nav item */
.admin-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 8px;
  border-left: 3px solid transparent;
  background: transparent;
  color: var(--int-base);
  font-family: 'Open Sans', sans-serif;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
}

.admin-nav-item:hover {
  background: var(--form-background-hover);
}

.admin-nav-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--form-border);
  flex-shrink: 0;
  transition: background-color 150ms ease;
}

.admin-nav-label {
  line-height: 1.2;
}

/* Active item */
.admin-nav-item--active {
  background: var(--form-background);
  color: var(--int-base);
  font-weight: 700;
  border-left-color: var(--acc-base);
}

.admin-nav-item--active:hover {
  background: var(--form-background);
}

.admin-nav-item--active .admin-nav-dot {
  background: var(--acc-base);
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
