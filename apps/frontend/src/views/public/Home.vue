<template>
 <main class="home">
    <section class="hero">
      <h1>{{ $t('home.hero.title') }}</h1>
      <p>{{ $t('home.hero.subtitle') }}</p>
      <div id="home-rsvp" v-if="!loading">
        <Button
          v-if="!isClosed()"
          :label="$t('home.hero.cta')" size="large"
          class="flex items-center gap-2 font-sans"
          icon="i-solar:pen-new-square-bold"
          @click="router.push({ name: 'public-rsvp-lookup', params: { lang } })"
        />
        <Message v-else severity="contrast" variant="outlined" size="small" icon="i-solar:alarm-sleep-bold">{{ $t('home.rsvpClosed')}}</Message>
      </div>
    </section>
    <section class="wedding-countdown-section my-8">
      <WeddingCountdown />
    </section>

    <section class="story">
      <h2>{{ $t('home.story.title') }}</h2>
      <p>{{ $t('home.story.text1') }}</p>
      <p>{{ $t('home.story.text2') }}</p>
    </section>

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
import SolarLetterLinear from '~icons/solar/letter-linear'
const { t } = useI18n()
const { settings, loading, isClosed } = useGuestSettings()
const route = useRoute()
const router = useRouter()
const lang = route.params.lang || 'en'
</script>

<style scoped>
.hero {
  text-align: center;
}

.hero h1 {
  @apply font-cursive text-txt text-align-center text-[4rem] mt-32 mb-16;
}

.hero p {
  @apply font-serif text-txt text-2xl mt-24 mb-32;
}

section {
  margin-bottom: 32px;
  @apply width: var(--container-6xl);
}

ul {
  list-style: none;
  padding-left: 0;
}

ul li {
  margin-bottom: 10px;
}

.story, .details{
  background: var(--bg-glass);
  border: 1px solid var(--bg-glass-border);;
  @apply p-16 rounded-md backdrop-blur-sm;
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
