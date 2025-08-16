<template>
  <!-- Hero Section - Full viewport height with background -->
  <section id="hero" class="hero-section relative min-h-lvh flex items-center justify-center w-full">
    <!-- Background images with theme switching -->
    <div class="absolute inset-0 w-full h-full z-0">
      <!-- Light mode image -->
      <img 
        :src="uploadsUrl + '/hero.png'"
        alt="Brigita and Jeffrey in tokyo smiling at each other"
        class="w-full h-full object-cover transition-opacity duration-300"
        :class="{ 'opacity-0': isDarkMode, 'opacity-100': !isDarkMode }"
      />
      
      <!-- Dark mode image -->
      <img 
        :src="uploadsUrl + '/hero-dark.png'"
        alt="Brigita and Jeffrey in tokyo smiling at each other"
        class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
        :class="{ 'opacity-100': isDarkMode, 'opacity-0': !isDarkMode }"
      />
    </div>

    <!-- Hero content overlay -->
    <div class="hero-content text-center z-10 w-full mt-80 mx-16 md:mx-0">
      <div class="mb-4 flex justify-center">
          <svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 928.06 899.01" class="w-40 h-40">
            <path class="cls-1" d="M774.13,590.82c-10.31-5.88-21.25-10.84-30.81-17.94-17.37,17.03-56.54,13.16-56.09-16.06.16-10.35,13.41-22.18,22.47-15.14,7.65,5.94.08,16.02,1.06,18.95,2.72,8.08,18.03-4.22,18.73-13.5,2.39-31.76-40.81-35.8-58.11-11.05-20.07,28.7,3.04,57.64,31.16,67.34,2.26.78,5.41-.67,4.93,2.35-9.78,5.35-19.8,13.66-27.74,21.49-3.49,3.44-22.78,24.47-19.13,28.66,1.16.02,2.45.77,3.55.62,3.31-.45,30.78-23.21,36.63-27.27,22.16-15.39,48.27-30.88,74.84-36.34.35-2.43-.56-1.58-1.49-2.11Z"/>
            <!-- ... existing SVG paths ... -->
          </svg>
      </div>
      
      <h1 class="font-cursive w-full text-int-base m-0 text-5xl md:text-5xl text-shadow-sm lg:text-8xl">
        Brigita & Jeffrey
      </h1>

      <p class="font-serif font-bold text-lg/10 md:text-xl lg:text-4xl mb-16 text-int-base text-shadow-sm">
        {{ $t('home.hero.subtitle') }}
      </p>
      
      <div id="home-rsvp" v-if="!loading">
        <Button
          v-if="!isClosed()"
          :label="$t('home.hero.deadline', { deadline: rsvpDeadline })" 
          size="large"
          icon="i-solar:pen-new-square-bold"
          @click="goToRSVP"
          class="hero-cta-button w-full md:w-auto"
        />
        <Message v-else 
          severity="contrast" 
          variant="outlined" 
          size="normal" 
          icon="i-solar:alarm-sleep-bold"
          class="w-full md:w-auto">
          {{ $t('home.rsvpClosed') }}
        </Message>
      </div>
      <WeddingCountdown 
        class="mt-64"
      />
    </div>

    <!-- Scroll hint arrow at bottom of hero -->
    <div class="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
      <Button
        @click="scrollToSection('our-wedding')"
        size="large"
        severity="secondary"
        rounded
        :aria-label="$t('home.scrollHint')"
      >
        <i class="i-solar:alt-arrow-down-bold text-2xl"></i>
      </Button>
    </div>
  </section>

  <!-- Content Sections - Using consistent pattern -->
  <section id="our-wedding" class="content-section content-section-alt">
    <div class="section-layout">
      <!-- Left side: Text content -->
      <div class="section-content section-content-left">
        <h2 class="section-title text-left animate-on-scroll-left">{{ $t('home.ourWedding.title') }}</h2>
        <p class="section-description text-left animate-on-scroll-left">{{ $t('home.ourWedding.description') }}</p>
        
        <Button 
          :label="$t('home.ourWedding.cta')"
          icon="i-solar:heart-bold"
          class="mt-8 section-button w-full lg:w-fit animate-on-scroll-left"
          @click="scrollToSection('event-details')"
        />
      </div>
      
      <!-- Right side: Image/placeholder -->
      <div class="section-visual section-visual-right">
        <div class="w-full h-full bg-form-bg rounded-lg border-2 border-dashed border-form-border flex items-center justify-center">
          <span class="text-form-placeholder-text">{{ $t('home.ourWedding.imagePlaceholder') }}</span>
        </div>
      </div>
    </div>
  </section>

  <section id="event-details" class="content-section">
    <div class="section-layout">
      <!-- Left side: Image/placeholder -->
      <div class="section-visual section-visual-left">
        <div class="w-full h-full bg-form-bg rounded-lg border-2 border-dashed border-form-border flex items-center justify-center">
          <span class="text-form-placeholder-text">{{ $t('home.eventDetails.imagePlaceholder') }}</span>
        </div>
      </div>
      
      <!-- Right side: Text content -->
      <div class="section-content section-content-right">
        <h2 class="section-title text-left animate-on-scroll-right">{{ $t('home.eventDetails.title') }}</h2>
        <p class="section-description text-left animate-on-scroll-right">{{ $t('home.eventDetails.description') }}</p>
        
        <Button 
          :label="$t('home.eventDetails.cta')"
          icon="i-solar:calendar-bold"
          class="mt-8 section-button w-full lg:w-fit animate-on-scroll-right"
          @click="scrollToSection('tips')"
        />
      </div>
    </div>
  </section>

  <section id="tips" class="content-section content-section-alt">
    <div class="section-layout">
      <!-- Left side: Text content -->
      <div class="section-content section-content-left">
        <h2 class="section-title text-left animate-on-scroll-left">{{ $t('home.tips.title') }}</h2>
        <p class="section-description text-left animate-on-scroll-left">{{ $t('home.tips.description') }}</p>
        
        <Button 
          :label="$t('home.tips.cta')"
          icon="i-solar:lightbulb-bold"
          class="mt-8 section-button w-full lg:w-fit animate-on-scroll-left"
          @click="scrollToSection('travel')"
        />
      </div>
      
      <!-- Right side: Icon/placeholder -->
      <div class="section-visual section-visual-right">
        <div class="w-full h-full bg-form-bg rounded-full border-2 border-dashed border-form-border flex items-center justify-center">
          <span class="text-form-placeholder-text text-sm">{{ $t('home.tips.iconPlaceholder') }}</span>
        </div>
      </div>
    </div>
  </section>

  <section id="travel" class="content-section">
    <div class="section-layout">
      <!-- Left side: Map/placeholder -->
      <div class="section-visual section-visual-left">
        <div class="w-full h-full bg-form-bg rounded-lg border-2 border-dashed border-form-border flex items-center justify-center">
          <span class="text-form-placeholder-text">{{ $t('home.travel.imagePlaceholder') }}</span>
        </div>
      </div>
      
      <!-- Right side: Text content -->
      <div class="section-content section-content-right">
        <h2 class="section-title text-left animate-on-scroll-right">{{ $t('home.travel.title') }}</h2>
        <p class="section-description text-left animate-on-scroll-right">{{ $t('home.travel.description') }}</p>
        
        <Button 
          :label="$t('home.travel.cta')"
          icon="i-solar:map-point-bold"
          class="mt-8 section-button w-full lg:w-fit animate-on-scroll-right"
          @click="scrollToSection('contact')"
        />
      </div>
    </div>
  </section>

  <section id="contact" class="content-section content-section-alt">
    <div class="section-layout">
      <!-- Left side: Text content -->
      <div class="section-content section-content-left">
        <h2 class="section-title text-left animate-on-scroll-left">{{ $t('home.contact.title') }}</h2>
        <p class="section-description text-left animate-on-scroll-left">{{ $t('home.contact.description') }}</p>
        
        <Button 
          :label="$t('home.contact.cta')"
          icon="i-solar:pen-new-square-bold"
          class="mt-8 section-button w-full lg:w-fit animate-on-scroll-left"
          @click="goToRSVP"
        />
      </div>
      
      <!-- Right side: Image/placeholder -->
      <div class="section-visual section-visual-right">
        <div class="w-full h-full bg-form-bg rounded-lg border-2 border-dashed border-form-border flex items-center justify-center">
          <span class="text-form-placeholder-text">{{ $t('home.contact.imagePlaceholder') }}</span>
        </div>
      </div>
    </div>
  </section>

  <!-- ScrollTop component -->
  <ScrollTop 
    :threshold="100"
    class="custom-scroll-top"
    icon="i-solar:alt-arrow-up-bold"
  />
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useGuestSettings } from '@/hooks/useGuestSettings'
import { useRoute } from 'vue-router'
import WeddingCountdown from '@/components/WeddingCountdown.vue'
import { useRouter } from 'vue-router'
import { fetchRSVPSession } from '@/api/rsvp'
import { fetchGuestSettings } from '@/api/settings'
import { ref, onMounted, onUnmounted } from 'vue'
import ScrollTop from 'primevue/scrolltop'

const { t } = useI18n()
const { settings, loading, isClosed } = useGuestSettings()
const route = useRoute()
const router = useRouter()
const lang = route.params.lang || 'en'

// Theme state
const isDarkMode = ref(false)

// RSVP deadline state
const rsvpDeadline = ref(null)

// Define the uploads URL based on environment
const uploadsUrl = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5001/uploads'

/**
 * Check current theme state
 */
function checkTheme() {
  const element = document.getElementById('mode')
  isDarkMode.value = element ? element.classList.contains('dark-mode') : false
}

/**
 * Fetch RSVP deadline from backend
 */
async function fetchRSVPDeadline() {
  try {
    const guestSettings = await fetchGuestSettings()
    if (guestSettings.rsvp_deadline) {
      // Format the deadline based on language
      const deadline = new Date(guestSettings.rsvp_deadline)
      if (lang === 'lt') {
        // Lithuanian format: "2026 m. rugpjūčio 1 d."
        rsvpDeadline.value = deadline.toLocaleDateString('lt-LT', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      } else {
        // English format: "August 1st, 2026"
        rsvpDeadline.value = deadline.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      }
    }
  } catch (error) {
    console.error('Failed to fetch RSVP deadline:', error)
  }
}

/**
 * Navigate to the full RSVP form if there's an active session; otherwise, go to lookup.
 */
async function goToRSVP() {
  try {
    const session = await fetchRSVPSession()
    if (session?.code) {
      // Jump directly to the form
      router.push({ name: 'public-rsvp', params: { lang, code: session.code } })
      return
    }
  } catch {
    // No valid session
  }
  // Fallback to lookup
  router.push({ name: 'public-rsvp-lookup', params: { lang } })
}

/**
 * Scroll to a specific section
 */
function scrollToSection(sectionId) {
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }
}

/**
 * Handle scroll events for animations
 */
function handleScroll() {
  // Trigger animations for elements in viewport
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-visible')
      }
    })
  }, { threshold: 0.1 })
  
  // Observe all animate-on-scroll elements
  document.querySelectorAll('.animate-on-scroll-left, .animate-on-scroll-right').forEach(el => observer.observe(el))
}

// Watch for theme changes
let observer

onMounted(() => {
  // Initial theme check
  checkTheme()
  
  // Watch for theme changes by observing the mode element
  const modeElement = document.getElementById('mode')
  if (modeElement) {
    observer = new MutationObserver(() => {
      checkTheme()
    })
    
    observer.observe(modeElement, {
      attributes: true,
      attributeFilter: ['class']
    })
  }
  
  // Add scroll listener for animations
  window.addEventListener('scroll', handleScroll)
  
  // Initial scroll check
  handleScroll()
  
  fetchRSVPDeadline()
})

onUnmounted(() => {
  // Clean up observer and scroll listener
  if (observer) {
    observer.disconnect()
  }
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style>
/* Global overrides for this page only - keeping them local as requested */
.cls-1 {
  fill: var(--int-base);
  align-content: center;
}

main.container {
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: visible !important;
}

main.container .hero-section,
main.container .content-section {
  width: 100vw !important;
  margin-left: calc(-50vw + 50%) !important;
  margin-right: calc(-50vw + 50%) !important;
  position: relative !important;
}

/* Hero section positioning */
main.container .hero-section {
  z-index: 0 !important;
  margin-top: -80px !important;
}

/* Remove spacing between sections */
main.container .content-section {
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

/* Z-index hierarchy */
header { z-index: 100 !important; }
main.container .hero-section { z-index: 0 !important; }
main.container .content-section { z-index: 1 !important; }
main.container .p-scrolltop { z-index: 50 !important; }

/* Ensure proper scrolling */
html, body {
  overflow-x: visible !important;
  overflow-y: auto !important;
  height: auto !important;
}
</style>

<style scoped>
/* Hero section */
.hero-section {
  text-align: center;
  z-index: 0;
  margin-top: -80px;
}

/* Section layout - two equal columns with aligned gutters */
.section-layout {
  @apply grid grid-cols-1 lg:grid-cols-2 min-h-96;
  gap: 0 40px; /* 40px horizontal gap on desktop */
}

/* Visual side - extends to viewport edge */
.section-visual {
  @apply w-full h-full p-8 lg:p-0;
}

.section-visual-left {
  @apply order-1 lg:order-1;
}

.section-visual-right {
  @apply order-1 lg:order-2;
}

/* Content side - alternating vertical alignment */
.section-content {
  @apply flex flex-col py-24;
}

.section-content-left {
  @apply order-2 lg:order-1 px-16 md:px-40 lg:pr-0;
}

.section-content-right {
  @apply order-2 lg:order-2 px-16 md:px-40 lg:pl-0;
}

/* Alternating vertical alignment */
.section-content-left {
  @apply justify-end; /* Bottom alignment when image is on left */
}

.section-content-right {
  @apply justify-start; /* Top alignment when image is on right */
}

/* Unified content section styles */
.content-section {
  @apply w-full m-0 p-0 z-1;
  background-color: var(--card-bg);
}

.content-section-alt {
  background-color: transparent;
}

/* Typography using design tokens */
.section-title {
  @apply font-serif text-int-base text-4xl md:text-5xl mb-8;
}

.section-description {
  @apply font-sans text-txt text-lg md:text-xl leading-relaxed max-w-3xl;
}

/* Button styles - unified hover effects */
.section-button,
.hero-cta-button {
  @apply transition-all duration-300 hover:scale-105 hover:shadow-lg;
}

/* Custom ScrollTop - using design tokens */
.custom-scroll-top {
  @apply fixed bottom-8 left-8 z-50 bg-int-base text-ac2-base w-12 h-12 flex items-center justify-center rounded-full border-2 border-int-base transition-all duration-300 shadow-lg;
}

.custom-scroll-top:hover {
  @apply bg-int-hover border-int-hover scale-110 shadow-xl;
}

.custom-scroll-top:focus {
  @apply outline-none;
  box-shadow: 0 0 0 3px var(--acc-base) !important;
}

/* Scroll animations - simplified */
.animate-on-scroll-left,
.animate-on-scroll-right {
  @apply opacity-0 transition-all duration-1000 ease-out;
}

.animate-on-scroll-left {
  transform: translateX(-50px);
}

.animate-on-scroll-right {
  transform: translateX(50px);
}

.animate-on-scroll-left.animate-visible,
.animate-on-scroll-right.animate-visible {
  @apply opacity-100;
  transform: translateX(0);
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .section-layout {
    @apply grid-cols-1;
  }
  
  .section-content {
    @apply px-16 md:px-40;
  }
  
  .section-visual {
    @apply p-8;
  }
}
</style>
