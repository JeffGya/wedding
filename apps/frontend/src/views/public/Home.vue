<template>
  <!-- Hero Section - Full viewport height with background -->
  <section id="hero" class="hero-section relative min-h-lvh flex items-center justify-center w-full">
    <!-- Background images with theme switching -->
    <div class="absolute inset-0 w-full h-full z-0 hero-background">
      <!-- Light mode image -->
      <img 
        :src="uploadsUrl + '/hero.png'"
        alt="Brigita and Jeffrey looking confidently at the camera on shibuya crossing - Light version"
        class="w-full h-full object-cover transition-opacity duration-300"
        :class="{ 'opacity-0': isDarkMode, 'opacity-100': !isDarkMode }"
      />
      
      <!-- Dark mode image -->
      <img 
        :src="uploadsUrl + '/hero-dark.png'"
        alt="Brigita and Jeffrey looking confidently at the camera on shibuya crossing - Dark version"
        class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
        :class="{ 'opacity-100': isDarkMode, 'opacity-0': !isDarkMode }"
      />
    </div>

    <!-- Hero content overlay -->
    <div class="hero-content text-center z-10 w-full mt-80 mx-16 md:mx-0">
      <div class="mb-4 flex justify-center">
      </div>
      
      <div class="typewriter-heading-wrapper w-full">
        <h1 ref="headingRef" class="font-cursive text-int-base m-0 text-5xl md:text-8xl tracking-tight text-shadow-md lg:text-shadow-lg lg:text-9xl typewriter-heading"></h1>
      </div>

      <div class="typewriter-subtitle-wrapper w-full">
        <p ref="subtitleRef" class="font-serif font-bold text-lg/10 md:text-xl lg:text-2xl mb-16 text-int-base text-shadow-sm typewriter-subtitle"></p>
      </div>
      
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
          size="normal" 
          icon="i-solar:alarm-sleep-bold"
          class="w-full md:w-fit m-auto">
          {{ $t('home.rsvpClosed') }}
        </Message>
      </div>
      <WeddingCountdown 
        ref="countdownRef"
        class="mt-64 countdown-fade-in"
      />
    </div>

    <!-- Scroll hint arrow at bottom of hero -->
    <div class="absolute bottom-40 left-1/2 transform -translate-x-1/2 z-20 scroll-hint-wrapper">
      <Button
        @click="scrollToSection('our-wedding')"
        size="large"
        severity="secondary"
        rounded
        :aria-label="$t('home.scrollHint')"
        icon="i-solar:alt-arrow-down-bold"
      >
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
          severity="secondary"
          @click="goToPageOrScroll(pageSlugMap.ourWedding, 'event-details')"
        />
      </div>
      
      <!-- Right side: Image/placeholder -->
      <div class="section-visual section-visual-right">
        <div class="w-full h-full flex items-center justify-center">
          <img 
            :src="uploadsUrl + '/engagement.jpg'" 
            alt="Brigita and Jeffrey in a restaurant, after their engagement on table mountain in cape town, south africa"
            class="w-full h-fit object-cover"
            :class="{ 'brightness-60': isDarkMode, 'brightness-100': !isDarkMode }"
          >
        </div>
      </div>
    </div>
  </section>

  <section id="event-details" class="content-section">
    <div class="section-layout">
      <!-- Left side: Image/placeholder -->
      <div class="section-visual section-visual-left">
        <div class="w-full h-full bg-form-bg flex items-center justify-center">
         <!-- <img 
            :src="uploadsUrl + '/sunset-kiss.mp4'" 
            alt="Brigita and Jeffrey in a restaurant, after their engagement on table mountain in cape town, south africa"
            class="w-full h-fit object-cover"
            :class="{ 'brightness-60': isDarkMode, 'brightness-100': !isDarkMode }"
          > -->
          <video :src="uploadsUrl + '/sunset-kiss.mp4'" class="w-full h-fit object-cover" :class="{ 'brightness-60': isDarkMode, 'brightness-100': !isDarkMode }" muted loop autoplay playsinline></video>
        </div>
      </div>
      
      <!-- Right side: Text content -->
      <div class="section-content section-content-right">
        <h2 class="section-title text-left animate-on-scroll-right">{{ $t('home.eventDetails.title') }}</h2>
        <ul class="list-none list-outside -indent-10 font-sans space-y-4 mb-0 animate-on-scroll-right">
          <li><strong>{{ $t('home.eventDetails.dateTitle') }}:</strong> {{ $t('home.eventDetails.date') }}</li>
          <li><strong>{{ $t('home.eventDetails.locationTitle') }}:</strong> {{ $t('home.eventDetails.location') }}</li>
          <li><strong>{{ $t('home.eventDetails.venueTitle') }}:</strong> {{ $t('home.eventDetails.venue') }}</li>
          <li><strong>{{ $t('home.eventDetails.timeTitle') }}:</strong> {{ $t('home.eventDetails.time') }}</li>
        </ul>
        <p class="section-description text-left animate-on-scroll-right">{{ $t('home.eventDetails.description') }}</p>
        
        <Button 
          :label="$t('home.eventDetails.cta')"
          icon="i-solar:calendar-bold"
          class="mt-8 section-button w-full lg:w-fit animate-on-scroll-right"
          severity="secondary"
          @click="goToPageOrScroll(pageSlugMap.eventDetails, 'tips')"
        />
      </div>
    </div>
  </section>

  <section id="travel" class="content-section-alt">
    <div class="section-layout">
      <!-- Right side: Text content -->
      <div class="section-content section-content-left">
        <h2 class="section-title text-left animate-on-scroll-left">{{ $t('home.travel.title') }}</h2>
        <p class="section-description text-left animate-on-scroll-left">{{ $t('home.travel.description') }}</p>
        
        <Button 
          :label="$t('home.travel.cta')"
          icon="i-solar:point-on-map-bold"
          class="mt-8 section-button w-full lg:w-fit animate-on-scroll-left"
          severity="secondary"
          @click="goToPageOrScroll(pageSlugMap.travel, 'contact')"
        />
      </div>

      <!-- Left side: Map/placeholder -->
      <div class="section-visual section-visual-right">
        <div class="w-full h-full flex items-center justify-center">
          <iframe src="https://www.google.com/maps/d/u/0/embed?mid=1CvgheUvMiHJBmExqMLYyjtlqHThaLHo&ehbc=2E312F&noprof=1" class="w-full min-h-64 h-full" loading="lazy" referrerpolicy="no-referrer-when-downgrade" style="border:0;" allowfullscreen=""></iframe>
        </div>
      </div>
    </div>
  </section>

  <section id="tips" class="content-section content-section">
    <div class="section-layout">

      <!-- Left side: Image/placeholder -->
      <div class="section-visual section-visual-left">
        <div class="w-full h-full bg-form-bg flex items-center justify-center">
          <img 
            :src="uploadsUrl + '/collage.png'" 
            alt="Collage of pictures from Lithuania including buildings in Vilnius, summer houses and peole enjoying themselves"
            class="w-full h-fit object-cover"
            :class="{ 'brightness-60': isDarkMode, 'brightness-100': !isDarkMode }"
          >
        </div>
      </div>

      <!-- Right side: Text content -->
      <div class="section-content section-content-right">
        <h2 class="section-title text-left animate-on-scroll-right">{{ $t('home.tips.title') }}</h2>
        <p class="section-description text-left animate-on-scroll-right">{{ $t('home.tips.description') }}</p>
        
        <Button 
          :label="$t('home.tips.cta')"
          icon="i-solar:medal-ribbons-star-bold"
          class="mt-8 section-button w-full lg:w-fit animate-on-scroll-right"
          severity="secondary"
          @click="goToPageOrScroll(pageSlugMap.tips, 'travel')"
        />
      </div>
    </div>
  </section>

  <section v-if="!isClosed()" id="contact" class="content-section content-section-alt">
    <div class="section-layout">
      <!-- Left side: Text content -->
      <div class="section-content section-content-left">
        <h2 class="section-title text-left animate-on-scroll-left">{{ $t('home.contact.title') }}</h2>
        <p class="section-description text-left animate-on-scroll-left">{{ $t('home.contact.description') }}</p>
        
        <Button 
          :label="$t('home.contact.cta')"
          icon="i-solar:pen-new-square-bold"
          class="mt-8 section-button w-full lg:w-fit animate-on-scroll-left"
          severity="secondary"
          @click="goToRSVP"
        />
      </div>
      
      <!-- Right side: Image/placeholder -->
      <div class="section-visual section-visual-right">
        <div class="w-full h-full bg-form-bg flex items-center justify-center">
          <img 
            :src="uploadsUrl + '/us-cute.jpg'" 
            alt="Brigita and Jeffrey in tokyo smiling at each other"
            class="w-full h-fit object-cover"
            :class="{ 'brightness-60': isDarkMode, 'brightness-100': !isDarkMode }"
          >
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
import { fetchNavigation } from '@/api/navigation'
import { fetchRSVPSession } from '@/api/rsvp'
import { fetchGuestSettings } from '@/api/settings'
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import ScrollTop from 'primevue/scrolltop'
import Typed from 'typed.js'

const { t } = useI18n()
const { settings, loading, isClosed } = useGuestSettings()
const route = useRoute()
const router = useRouter()
const lang = route.params.lang || 'en'

// Map home CTAs to their intended page slugs
// Update these slugs to match created pages in Admin
const pageSlugMap = {
  ourWedding: 'our-wedding',
  eventDetails: 'event-details',
  travel: 'travel',
  tips: 'tips'
}

// Track available public page slugs to know whether to route or scroll
const availableSlugs = ref(new Set())

// Theme state
const isDarkMode = ref(false)

// RSVP deadline state
const rsvpDeadline = ref(null)

// Define the uploads URL based on environment
const uploadsUrl = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5001/uploads'

// Typewriter refs
const headingRef = ref(null)
const subtitleRef = ref(null)
const countdownRef = ref(null)

// Typed instances
let headingTyped = null
let subtitleTyped = null
let countdownObserver = null

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
    // Silently fail for RSVP deadline - not critical for home page
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
 * Navigate to a public page by slug if it exists; otherwise scroll to section.
 */
function goToPageOrScroll(slug, fallbackSectionId) {
  if (slug && availableSlugs.value.has(slug)) {
    router.push({ name: 'public-page', params: { lang, slug } })
  } else {
    scrollToSection(fallbackSectionId)
  }
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

/**
 * Initialize typewriter animations
 */
function initTypewriter() {
  if (!headingRef.value || !subtitleRef.value) return

  const subtitleText = t('home.hero.subtitle')
  // Escape ampersand for typed.js (it uses innerHTML which parses HTML entities)
  const initialHeading = "Brigita & Jeffrey".replace(/&/g, '&amp;')
  
  // Set initial invisible content to prevent layout shifts
  // Use textContent to avoid HTML entity issues with &
  const headingPlaceholder = document.createElement('span')
  headingPlaceholder.style.visibility = 'hidden'
  headingPlaceholder.style.whiteSpace = 'pre'
  headingPlaceholder.textContent = initialHeading
  headingRef.value.innerHTML = ''
  headingRef.value.appendChild(headingPlaceholder)

  const subtitlePlaceholder = document.createElement('span')
  subtitlePlaceholder.style.visibility = 'hidden'
  subtitlePlaceholder.style.whiteSpace = 'pre'
  subtitlePlaceholder.textContent = subtitleText
  subtitleRef.value.innerHTML = ''
  subtitleRef.value.appendChild(subtitlePlaceholder)

  // First phase: Type heading, then subtitle
  // Clear placeholder before typing
  headingRef.value.innerHTML = ''
  
  headingTyped = new Typed(headingRef.value, {
    strings: [initialHeading],
    typeSpeed: 80,
    backSpeed: 0,
    loop: false,
    showCursor: true,
    cursorChar: '|',
    shuffle: false,
    fadeOut: false,
    onTypingPaused: (arrayPos, self) => {
      // Cursor positioning handled in onStringTyped and onComplete
    },
    onStringTyped: (arrayPos, self) => {
      // Find cursor and force inline display (typed.js creates it as a sibling)
      const parentElement = headingRef.value?.parentElement
      const wrapperElement = parentElement?.classList?.contains('typewriter-heading-wrapper') ? parentElement : null
      const wrapperChildren = wrapperElement ? Array.from(wrapperElement.children) : []
      const cursorEl = headingRef.value?.querySelector('.typed-cursor') || 
                       headingRef.value?.querySelector('span.typed-cursor') ||
                       Array.from(headingRef.value?.children || []).find(el => el.classList?.contains('typed-cursor')) ||
                       wrapperChildren.find(s => s.classList?.contains('typed-cursor'))
      
      // Force cursor to be inline and match heading font size and color
      if (cursorEl) {
        const headingStyle = window.getComputedStyle(headingRef.value)
        cursorEl.style.display = 'inline'
        cursorEl.style.width = 'auto'
        cursorEl.style.height = 'auto'
        cursorEl.style.fontSize = headingStyle.fontSize
        cursorEl.style.lineHeight = headingStyle.lineHeight
        cursorEl.style.color = headingStyle.color
      }
    },
    onComplete: () => {
      // Find cursor and force inline display (typed.js creates it as a sibling)
      const parentElement = headingRef.value?.parentElement
      const wrapperElement = parentElement?.classList?.contains('typewriter-heading-wrapper') ? parentElement : null
      const wrapperChildren = wrapperElement ? Array.from(wrapperElement.children) : []
      const cursorEl = headingRef.value?.querySelector('.typed-cursor') || 
                       headingRef.value?.querySelector('span.typed-cursor') ||
                       Array.from(headingRef.value?.children || []).find(el => el.classList?.contains('typed-cursor')) ||
                       wrapperChildren.find(s => s.classList?.contains('typed-cursor'))
      
      // Force cursor to be inline and match heading font size and color
      if (cursorEl) {
        const headingStyle = window.getComputedStyle(headingRef.value)
        cursorEl.style.display = 'inline'
        cursorEl.style.width = 'auto'
        cursorEl.style.height = 'auto'
        cursorEl.style.fontSize = headingStyle.fontSize
        cursorEl.style.lineHeight = headingStyle.lineHeight
        cursorEl.style.color = headingStyle.color
      }
      // After heading completes, start subtitle
      if (subtitleRef.value) {
        // Clear the placeholder
        subtitleRef.value.innerHTML = ''
        
        subtitleTyped = new Typed(subtitleRef.value, {
          strings: [subtitleText],
          typeSpeed: 60,
          backSpeed: 0,
          loop: false,
          showCursor: true,
          cursorChar: '|',
          shuffle: false,
          fadeOut: false,
          onStringTyped: (arrayPos, self) => {
            // Find cursor and force inline display (typed.js creates it as a sibling)
            const parentElement = subtitleRef.value?.parentElement
            const wrapperElement = parentElement?.classList?.contains('typewriter-subtitle-wrapper') ? parentElement : null
            const wrapperChildren = wrapperElement ? Array.from(wrapperElement.children) : []
            const cursorEl = subtitleRef.value?.querySelector('.typed-cursor') || 
                             wrapperChildren.find(s => s.classList?.contains('typed-cursor'))
            
            // Force cursor to be inline and match subtitle font size and color
            if (cursorEl) {
              const subtitleStyle = window.getComputedStyle(subtitleRef.value)
              cursorEl.style.display = 'inline'
              cursorEl.style.width = 'auto'
              cursorEl.style.height = 'auto'
              cursorEl.style.fontSize = subtitleStyle.fontSize
              cursorEl.style.lineHeight = subtitleStyle.lineHeight
              cursorEl.style.color = subtitleStyle.color
            }
          },
          onComplete: () => {
            // Find cursor and force inline display (typed.js creates it as a sibling)
            const parentElement = subtitleRef.value?.parentElement
            const wrapperElement = parentElement?.classList?.contains('typewriter-subtitle-wrapper') ? parentElement : null
            const wrapperChildren = wrapperElement ? Array.from(wrapperElement.children) : []
            const cursorEl = subtitleRef.value?.querySelector('.typed-cursor') || 
                             wrapperChildren.find(s => s.classList?.contains('typed-cursor'))
            
            // Force cursor to be inline and match subtitle font size and color
            if (cursorEl) {
              const subtitleStyle = window.getComputedStyle(subtitleRef.value)
              cursorEl.style.display = 'inline'
              cursorEl.style.width = 'auto'
              cursorEl.style.height = 'auto'
              cursorEl.style.fontSize = subtitleStyle.fontSize
              cursorEl.style.lineHeight = subtitleStyle.lineHeight
              cursorEl.style.color = subtitleStyle.color
            }
            // After both are complete, start the variation cycle
            setTimeout(() => {
              startHeadingVariations()
            }, 1000) // Small pause after both complete
          }
        })
      }
    }
  })
}

/**
 * Start heading variations cycle (after initial text is complete)
 */
function startHeadingVariations() {
  if (!headingRef.value) return

  // Destroy existing heading typed instance
  if (headingTyped) {
    headingTyped.destroy()
  }

  // Heading variations array (subtitle stays visible)
  // Use zero-width space instead of empty string to prevent layout shift while keeping cursor visible
  // Escape ampersands for typed.js
  const headingStrings = [
    "\u200B", // Zero-width space - maintains cursor position
    t('home.hero.typed.gyamfis'),
    "\u200B",
    t('home.hero.typed.wedding'),
    "\u200B",
    "Brigita & Jeffrey".replace(/&/g, '&amp;')
  ]

  // Clear placeholder before starting variations
  if (headingRef.value) {
    headingRef.value.innerHTML = ''
  }

  // Initialize heading typewriter with variations
  headingTyped = new Typed(headingRef.value, {
    strings: headingStrings,
    typeSpeed: 80,
    backSpeed: 50,
    loop: false,
    showCursor: true,
    cursorChar: '|',
    shuffle: false,
    fadeOut: false,
    onStringTyped: (arrayPos, self) => {
      // Find cursor and force inline display (typed.js creates it as a sibling)
      const parentElement = headingRef.value?.parentElement
      const wrapperElement = parentElement?.classList?.contains('typewriter-heading-wrapper') ? parentElement : null
      const wrapperChildren = wrapperElement ? Array.from(wrapperElement.children) : []
      const cursorEl = headingRef.value?.querySelector('.typed-cursor') || 
                       headingRef.value?.querySelector('span.typed-cursor') ||
                       Array.from(headingRef.value?.children || []).find(el => el.classList?.contains('typed-cursor')) ||
                       wrapperChildren.find(s => s.classList?.contains('typed-cursor'))
      
      // Force cursor to be inline and match heading font size and color
      if (cursorEl) {
        const headingStyle = window.getComputedStyle(headingRef.value)
        cursorEl.style.display = 'inline'
        cursorEl.style.width = 'auto'
        cursorEl.style.height = 'auto'
        cursorEl.style.fontSize = headingStyle.fontSize
        cursorEl.style.lineHeight = headingStyle.lineHeight
        cursorEl.style.color = headingStyle.color
      }
    },
    onComplete: () => {
      // Wait 30 seconds before restarting entire sequence
      setTimeout(() => {
        // Reset both animations
        if (headingTyped) {
          headingTyped.destroy()
        }
        if (subtitleTyped) {
          subtitleTyped.destroy()
        }
        // Clear the elements but maintain space with invisible placeholder
        const initialHeading = "Brigita & Jeffrey".replace(/&/g, '&amp;')
        const subtitleText = t('home.hero.subtitle')
        if (headingRef.value) {
          const headingPlaceholder = document.createElement('span')
          headingPlaceholder.style.visibility = 'hidden'
          headingPlaceholder.style.whiteSpace = 'pre'
          headingPlaceholder.textContent = initialHeading
          headingRef.value.innerHTML = ''
          headingRef.value.appendChild(headingPlaceholder)
        }
        if (subtitleRef.value) {
          const subtitlePlaceholder = document.createElement('span')
          subtitlePlaceholder.style.visibility = 'hidden'
          subtitlePlaceholder.style.whiteSpace = 'pre'
          subtitlePlaceholder.textContent = subtitleText
          subtitleRef.value.innerHTML = ''
          subtitleRef.value.appendChild(subtitlePlaceholder)
        }
        // Restart from beginning
        setTimeout(() => {
          initTypewriter()
        }, 100)
      }, 30000)
    }
  })
}

/**
 * Initialize countdown scroll fade-in
 */
function initCountdownFadeIn() {
  // Wait for next tick to ensure component is rendered
  nextTick(() => {
    if (!countdownRef.value) return

    // Get the actual DOM element (component instance or element)
    const countdownElement = countdownRef.value.$el || countdownRef.value
    
    // If it's a component, find the root div
    const targetElement = countdownElement.querySelector ? 
      countdownElement.querySelector('.wedding-countdown') || countdownElement : 
      countdownElement

    // Only proceed if targetElement is a valid Element node (nodeType 1)
    if (!targetElement || !(targetElement instanceof Element) || targetElement.nodeType !== 1) return

    // Ensure element starts hidden - add class to parent wrapper if it exists
    const countdownParentElement = targetElement.parentElement
    // Only operate on Element nodes (nodeType 1) for parent as well
    if (countdownParentElement && countdownParentElement instanceof Element && countdownParentElement.nodeType === 1 && !countdownParentElement.classList.contains('countdown-fade-in')) {
      countdownParentElement.classList.add('countdown-fade-in')
    }
    targetElement.classList.add('countdown-fade-in')
    targetElement.classList.remove('countdown-visible')
    if (countdownParentElement && countdownParentElement instanceof Element && countdownParentElement.nodeType === 1) {
      countdownParentElement.classList.remove('countdown-visible')
    }
    
    // Force opacity to 0 and visibility hidden via inline style with !important
    targetElement.style.setProperty('opacity', '0', 'important')
    targetElement.style.setProperty('visibility', 'hidden', 'important')

    // Small delay to ensure the hidden state is applied before checking visibility
    setTimeout(() => {
      countdownObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Small delay to ensure fade-in transition works
            setTimeout(() => {
              const countdownParent = entry.target.parentElement
              // Only operate on Element nodes (nodeType 1)
              if (!(entry.target instanceof Element) || entry.target.nodeType !== 1) return
              // Remove inline styles to allow CSS transition
              entry.target.style.removeProperty('opacity')
              entry.target.style.removeProperty('visibility')
              entry.target.classList.add('countdown-visible')
              if (countdownParent && countdownParent instanceof Element && countdownParent.nodeType === 1) {
                countdownParent.classList.add('countdown-visible')
              }
            }, 50)
          }
        })
      }, { threshold: 0.1 })

      countdownObserver.observe(targetElement)
      
      // Manually check if already in view (observer might not fire immediately)
      const rect = targetElement.getBoundingClientRect()
      const isInView = rect.top < window.innerHeight && rect.bottom > 0
      
      if (isInView) {
        setTimeout(() => {
          const countdownParent = targetElement.parentElement
          // Only operate on Element nodes (nodeType 1)
          if (!(targetElement instanceof Element) || targetElement.nodeType !== 1) return
          // Remove inline styles to allow CSS transition
          targetElement.style.removeProperty('opacity')
          targetElement.style.removeProperty('visibility')
          targetElement.classList.add('countdown-visible')
          if (countdownParent && countdownParent instanceof Element && countdownParent.nodeType === 1) {
            countdownParent.classList.add('countdown-visible')
          }
        }, 100)
      }
    }, 50)
  })
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

  // Load navigation pages and cache their slugs
  fetchNavigation(lang)
    .then(pages => {
      const slugs = new Set((pages || []).map(p => p.slug))
      availableSlugs.value = slugs
    })
    .catch(() => {
      // If the request fails, we'll just fallback to scrolling
      availableSlugs.value = new Set()
    })

  // Initialize typewriter animations after a short delay to ensure DOM is ready
  setTimeout(() => {
    initTypewriter()
  }, 100)

  // Hide countdown immediately on page load and watch for when it appears
  const hideCountdownElement = (element) => {
    if (!element) return
    // Only operate on Element nodes (nodeType 1), not Comment nodes (nodeType 8) or other types
    if (!(element instanceof Element) || element.nodeType !== 1) return
    element.classList.add('countdown-fade-in')
    element.classList.remove('countdown-visible')
    element.style.setProperty('opacity', '0', 'important')
    element.style.setProperty('visibility', 'hidden', 'important')
  }
  
  // Try to hide immediately
  nextTick(() => {
    if (countdownRef.value) {
      const countdownElement = countdownRef.value.$el || countdownRef.value
      const targetElement = countdownElement.querySelector ? 
        countdownElement.querySelector('.wedding-countdown') || countdownElement : 
        countdownElement
      
      // Only operate on Element nodes (nodeType 1), not Comment nodes or other types
      if (targetElement && targetElement instanceof Element && targetElement.nodeType === 1) {
        hideCountdownElement(targetElement)
      }
    }
    
    // Watch for when the countdown element appears (since it uses v-if)
    const observer = new MutationObserver((mutations) => {
      if (countdownRef.value) {
        const countdownElement = countdownRef.value.$el || countdownRef.value
        const targetElement = countdownElement.querySelector ? 
          countdownElement.querySelector('.wedding-countdown') || countdownElement : 
          countdownElement
        // Only operate on Element nodes (nodeType 1), not Comment nodes or other types
        if (targetElement && targetElement instanceof Element && targetElement.nodeType === 1 && !targetElement.classList.contains('countdown-fade-in')) {
          hideCountdownElement(targetElement)
        }
      }
    })
    
    // Observe the parent container for when countdown appears
    const heroContent = document.querySelector('.hero-content')
    if (heroContent) {
      observer.observe(heroContent, {
        childList: true,
        subtree: true
      })
    }
    
    // Clean up observer after 10 seconds (countdown should be loaded by then)
    setTimeout(() => {
      observer.disconnect()
    }, 10000)
  })

  // Initialize countdown fade-in with 5 second delay after page load
  setTimeout(() => {
    initCountdownFadeIn()
  }, 7000)
})

onUnmounted(() => {
  // Clean up observer and scroll listener
  if (observer) {
    observer.disconnect()
  }
  window.removeEventListener('scroll', handleScroll)

  // Clean up typewriter instances
  if (headingTyped) {
    headingTyped.destroy()
    headingTyped = null
  }
  if (subtitleTyped) {
    subtitleTyped.destroy()
    subtitleTyped = null
  }

  // Clean up countdown observer
  if (countdownObserver) {
    countdownObserver.disconnect()
    countdownObserver = null
  }
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

/* Hero background - no need for extra height now */
.hero-background {
  height: 100%;
  top: 0;
}
</style>

<style scoped>
/* Hero section extends to account for header overlap */
.hero-section {
  text-align: center;
  z-index: 0;
  margin-top: -80px;
  min-height: calc(100vh + 32px); /* Extend by 80px to account for header */
}

/* Section layout - two equal columns with aligned gutters */
.section-layout {
  @apply grid grid-cols-1 lg:grid-cols-2 min-h-96;
}

/* Visual side - ensure it stays in its column */
.section-visual {
  @apply w-full h-full max-h-128 p-0 md:p-8 lg:p-0;
  overflow: hidden; /* Prevent content from spilling out */
}

.section-visual-left {
  @apply order-1 lg:order-1;
}

.section-visual-right {
  @apply order-1 lg:order-2;
}

/* Content side - ensure it stays in its column */
.section-content {
  @apply flex flex-col py-24;
  overflow: hidden; /* Prevent content from spilling out */
}

.section-content-left {
  @apply order-2 lg:order-1 px-16 md:px-40 lg:pl-160;
}

.section-content-right {
  @apply order-2 lg:order-2 px-16 md:px-40 lg:pr-160;
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
  @apply font-serif text-int-base text-3xl md:text-4xl mb-8;
}

.section-description {
  @apply font-sans text-txt leading-relaxed max-w-3xl;
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

/* Custom bounce animation for scroll button */
.scroll-button {
  animation: bounce 2s infinite;
}

.scroll-button:hover {
  animation: none;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}

/* Custom bounce animation for scroll hint wrapper */
.scroll-hint-wrapper {
  animation: bounce 2s infinite;
}

.scroll-hint-wrapper:hover {
  animation: none;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0) translateX(-50%); /* Keep horizontal centering */
  }
  40% {
    transform: translateY(-10px) translateX(-50%); /* Keep horizontal centering */
  }
  60% {
    transform: translateY(-5px) translateX(-50%); /* Keep horizontal centering */
  }
}

/* Ensure images and maps stretch full width on mobile/tablet */
.section-visual img,
.section-visual iframe {
  @apply w-full h-full object-cover;
}

/* Align visual content to top of section on mobile/tablet */
.section-visual > div {
  @apply w-full h-full;
}

/* Typewriter font preservation - ensure typed.js doesn't override fonts */
.typewriter-heading,
.typewriter-heading .typed-cursor,
.typewriter-heading span,
.typewriter-heading-wrapper .typed-cursor,
.typewriter-heading + .typed-cursor {
  font-family: 'Great Vibes', cursive !important;
}

.typewriter-subtitle,
.typewriter-subtitle .typed-cursor,
.typewriter-subtitle span,
.typewriter-subtitle-wrapper .typed-cursor,
.typewriter-subtitle + .typed-cursor {
  font-family: 'Lora', serif !important;
}

/* Wrapper to contain heading and cursor on same line */
.typewriter-heading-wrapper,
.typewriter-subtitle-wrapper {
  display: flex;
  justify-content: center;
  align-items: baseline;
  flex-wrap: nowrap;
  width: 100%;
}

/* Force cursor to be inline in flex container - override typed.js default block display */
.typewriter-heading-wrapper .typed-cursor,
.typewriter-subtitle-wrapper .typed-cursor {
  display: inline !important;
  flex: 0 0 auto !important;
  width: auto !important;
  height: auto !important;
  max-width: none !important;
  max-height: none !important;
}

/* Additional override for any typed.js inline styles */
.typewriter-heading-wrapper span.typed-cursor,
.typewriter-subtitle-wrapper span.typed-cursor {
  display: inline !important;
}

/* Prevent layout shifts - maintain consistent sizing */
.typewriter-heading {
  display: inline;
  /* Preserve space to prevent jumping - use line-height to maintain height */
  min-height: 1.2em;
  line-height: 1.2;
}

.typewriter-heading:empty::before {
  content: '\00A0'; /* Non-breaking space to maintain height */
  visibility: hidden;
  display: inline-block;
}

.typewriter-heading span {
  display: inline;
}

/* Display inline so cursor sibling appears on same line */
.typewriter-subtitle {
  display: inline;
  min-height: 1.2em;
  line-height: 1.2;
}

.typewriter-subtitle:empty::before {
  content: '\00A0'; /* Non-breaking space to maintain height */
  visibility: hidden;
  display: inline-block;
}

.typewriter-subtitle span {
  display: inline;
}

/* Typewriter cursor styling - always visible and inline */
/* Note: typed.js creates cursor as a sibling span, not a child */
.typewriter-heading-wrapper .typed-cursor,
.typewriter-subtitle-wrapper .typed-cursor,
.typewriter-heading + .typed-cursor,
.typewriter-subtitle + .typed-cursor,
.typewriter-heading .typed-cursor,
.typewriter-subtitle .typed-cursor,
.typed-cursor {
  color: inherit !important;
  font-weight: inherit !important;
  opacity: 1 !important;
  animation: blink 1s infinite;
  display: inline !important;
  visibility: visible !important;
  vertical-align: baseline !important;
  line-height: inherit !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
  padding: 0 !important;
  border: none !important;
  background: none !important;
  float: none !important;
  clear: none !important;
  flex-shrink: 0 !important;
  width: auto !important;
  height: auto !important;
  max-width: none !important;
  max-height: none !important;
}

/* Override typed.js default block display - must come after general rule */
.typewriter-heading-wrapper span.typed-cursor,
.typewriter-subtitle-wrapper span.typed-cursor {
  display: inline !important;
}

/* Ensure cursor appears inline with text when it's a sibling */
.typewriter-heading-wrapper .typed-cursor,
.typewriter-subtitle-wrapper .typed-cursor {
  font-family: inherit !important;
}

/* Ensure cursor is always present even when text is empty */
.typewriter-heading:has(.typed-cursor:empty),
.typewriter-subtitle:has(.typed-cursor:empty) {
  min-height: 1.2em;
}

/* Countdown fade-in animation - hide by default until visible */
.wedding-countdown {
  opacity: 0 !important;
  visibility: hidden !important;
  transition: opacity 300ms ease-out, visibility 0s linear 300ms;
}

.countdown-fade-in.countdown-visible .wedding-countdown,
.countdown-visible .wedding-countdown {
  opacity: 1 !important;
  visibility: visible !important;
  transition: opacity 300ms ease-out, visibility 0s;
}

/* Blink animation for cursor */
@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}
</style>
