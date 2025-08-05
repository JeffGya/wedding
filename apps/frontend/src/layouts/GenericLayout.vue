<script setup>
import { useHead } from '@vueuse/head'

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
    <header class="mb-16 md:mb-24 lg:mb-32">
      <GenericHeader />
    </header>
    <router-view :key="$route.fullPath" />
    <footer class="mt-32 md:mt-40 lg:mt-48 py-16 md:py-24 border-t border-form-border">
      <div class="container mx-auto px-16 md:px-40 lg:px-80">
        <div class="flex flex-col md:flex-row items-center justify-between space-y-8 md:space-y-0">
          <!-- Wedding Info -->
          <div class="text-center md:text-left">
            <h3 class="text-xl font-cursive text-int-base mb-2">Brigita & Jeffrey</h3>
            <p class="text-sm font-serif text-txt opacity-75">August 1st, 2024</p>
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
              © 2024 Brigita & Jeffrey. All rights reserved.
            </p>
          </div>
        </div>
        
        <!-- Bottom Section -->
        <div class="mt-16 pt-16 border-t border-form-border opacity-50">
          <div class="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <p class="text-xs font-sans text-txt">
              Made with ❤️ for our special day
            </p>
            <div class="flex items-center space-x-4">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>
    </footer>
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
/* Add your styles here */
</style>
