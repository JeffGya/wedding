<template>
 <main class="home mx-16 md:mx-40 lg:mx-80">
    <section class="hero mt-8 mb-24">
      <h1 class="font-cursive text-align-center text-5xl/14 lg:text-[4rem]/20 m-0">
        <span class="-ml-128 lg:-ml-[14rem]">Brigita</span>
        <br/>&<br/>
        <span class="ml-128 lg:ml-[14rem]">Jeffrey</span>
      </h1>
      <p class="font-cursive text-3xl/10 mt-24 mb-8">{{ $t('home.hero.subtitle') }}</p>
      <div id="home-rsvp" v-if="!loading">
        <Button
          v-if="!isClosed()"
          :label="$t('home.hero.cta')" size="large"
          class="font-sans w-full md:w-auto"
          icon="i-solar:pen-new-square-bold"
          @click="router.push({ name: 'public-rsvp-lookup', params: { lang } })"
        />
        <Message v-else severity="contrast" variant="outlined" size="small" icon="i-solar:alarm-sleep-bold">{{ $t('home.rsvpClosed')}}</Message>
      </div>
    </section>

    <WeddingCountdown />

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
