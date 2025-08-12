<template>
  <!-- Full-page background image with theme switching -->
  <div class="fixed inset-0 w-screen h-screen -z-10">
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
      class="w-full h-full object-cover absolute inset-0 transition-opacity duration-300"
      :class="{ 'opacity-100': isDarkMode, 'opacity-0': !isDarkMode }"
    />
  </div>

  <!-- Hero content overlay -->
  <section class="hero mt-160 mb-24 md:mb-32 text-center">
    <h1
      class="font-cursive w-full text-[var(--int-base)] text-3xl m-0
        md:text-4xl md:px-4 md:py-4 md:text-shadow-sm
        lg:text-5xl
        "
    >
      Brigita & Jeffrey
    </h1>

    <p 
      class="font-serif text-lg/10 mt-0 md:text-xl lg:text-2xl lg:mt-8 mb-8 text-[var(--int-base)] md:text-shadow-sm"
    >
    {{ $t('home.hero.subtitle') }}
    </p>
    
    <div 
    id="home-rsvp"
    class="mt-24"
    v-if="!loading"
    >
      <Button
        v-if="!isClosed()"
        :label="$t('home.hero.deadline', { deadline: rsvpDeadline })" 
        size="large"
        icon="i-solar:pen-new-square-bold"
        @click="goToRSVP"
      />
      <Message v-else severity="contrast" variant="outlined" size="small" icon="i-solar:alarm-sleep-bold">{{ $t('home.rsvpClosed')}}</Message>
    </div>
  </section>

  <!-- Content with existing margins -->
  <div class="container mx-auto px-16 md:px-40 lg:px-80">
    <WeddingCountdown />

    <section class="details">
      <h2>{{ $t('home.details.title') }}</h2>
      <ul>
        <li><strong>{{ $t('home.details.dateLabel') }}:</strong> {{ t('home.details.dateValue') }}</li>
        <li><strong>{{ $t('home.details.venueLabel') }}:</strong> {{ t('home.details.venueValue') }}</li>
        <li><strong>{{ $t('home.details.timeLabel') }}:</strong> {{ t('home.details.timeValue') }}</li>
      </ul>
    </section>
  </div>
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
import SolarLetterLinear from '~icons/solar/letter-linear'

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
  
  fetchRSVPDeadline()
})

onUnmounted(() => {
  // Clean up observer
  if (observer) {
    observer.disconnect()
  }
})
</script>

<style scoped>
.hero {
  text-align: center;
}

.hero p {
  @apply ;
}

section {
  @apply mb-24 w-80%; 
  width: var(--container-6xl);
}

ul {
  list-style: none;
  padding-left: 0;
}

ul li {
  margin-bottom: 8px;
}

.story h2, .details h2 {
  margin-top: 0;
  margin-bottom: 16px;
}

#home-rsvp {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
