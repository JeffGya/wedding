<template>
    <Menubar class="MainNav" :model="menuItems">
      <template #start>
        <div class="logo">
          <router-link to="/en">Wedding Logo</router-link>
        </div>
      </template>
      
      <template v-for="(item, index) in menuItems" :key="index">
        <router-link :to="item.to || item.url">
          {{ item.label }}
        </router-link>
      </template>

      <template #end>
        <div class="flex items-center">
          <LanguageSwitcher class="mr-4" />
          <ToggleSwitch
            v-model="darkMode"
            class="ml-2 custom-toggle"
            @change="toggleDarkMode"
          >
            <!-- Custom handle with solar icons -->
            <template #handle="{ checked }">
              <i
                :class="[
                  'text-5xl p-8', // Adjust icon size
                  { 'i-solar:moon-stars-outline': checked, 'i-solar:sun-2-linear': !checked }
                ]"
              />
            </template>
          </ToggleSwitch>
        </div>
      </template>
    </Menubar>
</template>

<script>
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import Menubar from 'primevue/menubar';

export default {
  components: {
    LanguageSwitcher,
    Menubar,
  },
  data() {
    return {
      darkMode: false, // Default mode
      menuItems: [
        {
          label: 'Home',
          command: () => this.$router.push({ name: 'home', params: { lang: this.selectedLanguage } }),
        },
        {
          label: 'RSVP',
          command: () => this.$router.push({ name: 'public-rsvp-lookup', params: { lang: this.selectedLanguage } }),
        },
      ],
    };
  },
  methods: {
    toggleDarkMode() {
      const element = document.getElementById('mode');
      element.classList.toggle('dark-mode');
    },
  },
};
</script>

<style scoped>
.MainNav {
  @apply m-16 p-16 saturate-100 backdrop-blur-sm; 
  background: var(--bg-glass);
  border: 1px solid var(--bg-glass-border);
  border-radius: 0.5rem;
}
</style>