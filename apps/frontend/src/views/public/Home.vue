<template>
  <div class="home">
    <section class="hero">
      <h1>{{ t('home.hero.title') }}</h1>
      <p>{{ t('home.hero.subtitle') }}</p>
      <div v-if="!loading">
        <router-link
          v-if="!isClosed()"
          :to="{ name: 'public-rsvp-lookup', params: { lang } }"
          class="cta-button"
        >
          {{ t('home.hero.cta') }}
        </router-link>
        <span v-else class="text-gray-500">{{ t('home.rsvpClosed')}}</span>
      </div>
    </section>
    <section class="wedding-countdown-section my-8">
      <WeddingCountdown />
    </section>

    <section class="story">
      <h2>{{ t('home.story.title') }}</h2>
      <p>{{ t('home.story.text1') }}</p>
      <p>{{ t('home.story.text2') }}</p>
    </section>

    <section class="details">
      <h2>{{ t('home.details.title') }}</h2>
      <ul>
        <li><strong>{{ t('home.details.dateLabel') }}:</strong> {{ t('home.details.dateValue') }}</li>
        <li><strong>{{ t('home.details.venueLabel') }}:</strong> {{ t('home.details.venueValue') }}</li>
        <li><strong>{{ t('home.details.timeLabel') }}:</strong> {{ t('home.details.timeValue') }}</li>
      </ul>
    </section>

    <section class="rsvp">
      <h2>{{ t('home.rsvp.title') }}</h2>
      <p>{{ t('home.rsvp.desc') }}</p>
      <div v-if="!loading">
        <router-link
          v-if="!isClosed()"
          :to="{ name: 'public-rsvp-lookup', params: { lang } }"
          class="cta-button"
        >
          {{ t('home.rsvp.cta') }}
        </router-link>
        <span v-else class="text-gray-500">{{ t('home.rsvpClosed')}}</span>
        <CountdownTimer
          v-if="settings.rsvp_deadline && !isClosed()"
          :deadline="settings.rsvp_deadline"
        />
      </div>
    </section>
  </div>
</template>


<script setup>
import { useI18n } from 'vue-i18n'
import { useGuestSettings } from '@/hooks/useGuestSettings'
import CountdownTimer from '@/components/ui/CountdownTimer.vue'
import { useRoute } from 'vue-router'
import WeddingCountdown from '@/components/WeddingCountdown.vue';
const { t } = useI18n()
const { settings, loading, isClosed } = useGuestSettings()
const route = useRoute()
const lang = route.params.lang || 'en'
</script>

<style scoped>
.home {
  font-family: Arial, sans-serif;
  margin: 0 auto;
  max-width: 900px;
  padding: 20px;
}

.hero {
  background-color: #f8f9fa;
  padding: 40px;
  text-align: center;
}

.hero h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
}

.hero p {
  font-size: 1.2em;
  margin-bottom: 20px;
}

.cta-button {
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  font-size: 1.1em;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.cta-button:hover {
  background-color: #0056b3;
}

section {
  margin-bottom: 40px;
}

h2 {
  font-size: 2em;
  margin-bottom: 15px;
}

ul {
  list-style: none;
  padding-left: 0;
}

ul li {
  margin-bottom: 10px;
}
</style>
