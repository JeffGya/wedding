<template>
 <main class="home md:mt-48 lg:mt-64">
    <section class="hero mb-24 md:mb-32 text-center relative">
      <img 
        :src="uploadsUrl + '/hero.png'"
        alt="Brigita and Jeffrey in tokyo smiling at each other"
        class="w-full h-auto rounded-md -z-10 -mb-24 lg:-mb-40 border-solid border-[.5rem] md:border-[1rem] border-[var(--bg-glass-border)]"
      />
      <h1
        class="font-cursive w-full text-[var(--int-base)] text-3xl m-0 z-0
          md:mt-0 md:text-[3rem] md:absolute md:left-1/2 md:top-0 md:-translate-x-1/2 md:-translate-y-1/2 md:px-4 md:py-4 md:text-shadow-sm
          lg:text-[4rem]
          "
          
      >
        Brigita & Jeffrey
      </h1>

      <p 
        class="font-cursive text-xl/10 mt-0 md:text-4xl lg:text-5xl lg:mt-8 mb-8 text-[var(--int-base)] md:text-shadow-sm"
      >
      {{ $t('home.hero.subtitle') }}</p>
      <div 
      id="home-rsvp"
      class="mt-24"
      v-if="!loading"
      >
        <Button
          v-if="!isClosed()"
          :label="$t('home.hero.cta')" size="large"
          icon="i-solar:pen-new-square-bold"
          @click="goToRSVP"
        />
        <Message v-else severity="contrast" variant="outlined" size="small" icon="i-solar:alarm-sleep-bold">{{ $t('home.rsvpClosed')}}</Message>
      </div>
    </section>

    <WeddingCountdown />

    <section class="details">
      <h2>{{ $t('home.details.title') }}</h2>
      <ul>
        <li><strong>{{ $t('home.details.dateLabel') }}:</strong> {{ t('home.details.dateValue') }}</li>
        <li><strong>{{ $t('home.details.venueLabel') }}:</strong> {{ t('home.details.venueValue') }}</li>
        <li><strong>{{ $t('home.details.timeLabel') }}:</strong> {{ t('home.details.timeValue') }}</li>
      </ul>
    </section>
  </main>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useGuestSettings } from '@/hooks/useGuestSettings'
import { useRoute } from 'vue-router'
import WeddingCountdown from '@/components/WeddingCountdown.vue'
import { useRouter } from 'vue-router'
import { fetchRSVPSession } from '@/api/rsvp'
import SolarLetterLinear from '~icons/solar/letter-linear'
const { t } = useI18n()
const { settings, loading, isClosed } = useGuestSettings()
const route = useRoute()
const router = useRouter()
const lang = route.params.lang || 'en'

// Define the uploads URL based on environment
const uploadsUrl = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5001/uploads'

/**
 * Navigate to the full RSVP form if there’s an active session; otherwise, go to lookup.
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
