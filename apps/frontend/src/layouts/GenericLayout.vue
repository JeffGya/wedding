<script setup>
import { useHead } from '@vueuse/head'
import GenericHeader from '@/components/GenericHeader.vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

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
            <p class="text-sm font-serif text-txt opacity-75">{{ $t('footer.date') }}</p>
          </div>
          
          <!-- Navigation Links -->
          <nav class="flex flex-wrap justify-center gap-8 md:gap-16">
            <router-link 
              :to="{ name: 'public-rsvp-lookup', params: { lang: $route.params.lang || 'en' } }"
              class="text-sm font-sans text-txt hover:text-int-base transition-colors duration-200"
            >
              {{ $t('footer.nav.rsvp') }}
            </router-link>
            <a 
              href="mailto:messagesfrom@brigitaandjeffrey.com" 
              class="text-sm font-sans text-txt hover:text-int-base transition-colors duration-200"
            >
              {{ $t('footer.nav.contact') }}
            </a>
          </nav>
          
          <div class="flex justify-center">
            <p class="text-sm font-sanse">{{ $t('footer.nav.credit') }}<a 
              href="https://www.instagram.com/dziugiossventes" 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-sm font-sans text-int-base hover:underline"
            ><span icon="i-solar:camera-square-bold"></span>Iveta Dziuge</a>.
            </p>
          </div>
          
          
          <!-- Copyright -->
          <div class="text-center md:text-right">
            <p class="text-xs font-sans text-txt opacity-50">
              {{ $t('footer.copyright') }}
            </p>
          </div>
        </div>
        
        <!-- Bottom Section -->
        <div class="mt-16 pt-16 border-t border-form-border opacity-50">
          <div class="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <p class="text-xs font-sans text-txt">
              {{ $t('footer.madeWith') }}
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
