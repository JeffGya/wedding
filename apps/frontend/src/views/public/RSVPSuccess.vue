<template>
    <div class="rsvp-success max-w-md mx-auto p-6 text-center">
      <h1 class="text-3xl font-bold mb-4">{{ t('rsvp.successTitle') }}</h1>
      <p class="mb-6">{{ t('rsvp.successMessage') }}</p>
      <router-link :to="{ name: 'home', params: { lang: route.params.lang } }" class="text-blue-600 underline">
        {{ t('rsvp.backHome') }}
      </router-link>
    </div>
  </template>
  
  <script setup>
  import { useRoute } from 'vue-router'
  import { useI18n } from 'vue-i18n'
  
  const route = useRoute()
  const { t } = useI18n()
  </script>
  
  <style scoped>
  .rsvp-success { margin-top: 4rem; }
  </style>