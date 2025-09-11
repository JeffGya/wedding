<script setup>
import { useHead } from '@vueuse/head'
import { computed } from 'vue'

const appTitle = import.meta.env.VITE_APP_TITLE || 'Brigita + Jeffrey'

useHead({
  meta: [
    {
      name: 'robots',
      content: 'noindex, nofollow'
    }
  ]
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header - sticky on desktop only -->
    <header class="w-full sticky top-0 z-50">
      <GenericHeader />
    </header>
    
    <!-- Main content with margins - flex-grow to push footer down -->
    <main class="w-full mx-auto flex-grow">
      <router-view :key="$route.fullPath" />
    </main>
    
    <!-- Footer with background - sticky to bottom -->
    <footer class="py-16 md:py-24 bg-card-bg bg-opacity-50 backdrop-blur-sm relative z-10 pb-80">
      <div class="container mx-auto px-16 md:px-40 lg:px-80">
        <div class="flex flex-col md:flex-row items-center justify-between space-y-8 md:space-y-0">
          <!-- Wedding Info -->
          <div class="text-center md:text-left">
            <h3 class="text-xl font-cursive text-int-base mb-2">{{ appTitle }}</h3>
            <p class="text-sm font-serif text-txt opacity-75">August 1st, 2026</p>
          </div>
          
          <!-- Navigation Links -->
          <nav class="flex flex-wrap justify-center gap-8 md:gap-16">
            <router-link 
              :to="{ name: 'home', params: { lang: $route.params.lang || 'en' } }"
              class="text-sm font-sans text-txt hover:text-int-base transition-colors duration-200"
            >
              Home
            </router-link>
            <router-link 
              :to="{ name: 'public-rsvp-lookup', params: { lang: $route.params.lang || 'en' } }"
              class="text-sm font-sans text-txt hover:text-int-base transition-colors duration-200"
            >
              RSVP
            </router-link>
            <a 
              href="mailto:contact@brigitaandjeffrey.com" 
              class="text-sm font-sans text-txt hover:text-int-base transition-colors duration-200"
            >
              Contact
            </a>
          </nav>
          
          <!-- Copyright -->
          <div class="text-center md:text-right">
            <p class="text-xs font-sans text-txt opacity-50">
              © 2025-2026. All rights reserved.
            </p>
          </div>
        </div>
        
        <!-- Bottom Section -->
        <div class="mt-16 pt-16 border-t border-form-border opacity-50">
          <div class="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <p class="text-xs font-sans text-txt">
              Made with ❤️ for our big celebration.
            </p>
            <div class="flex items-center space-x-4">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script>
import GenericHeader from '@/components/GenericHeader.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';

export default {
  components: {
    GenericHeader,
    LanguageSwitcher,
  },
};
</script>

<style scoped>
/* Ensure sticky positioning works on desktop */
@media (min-width: 768px) {
  header {
    position: sticky !important;
    top: 0 !important;
    z-index: 50 !important;
  }
}
</style>
