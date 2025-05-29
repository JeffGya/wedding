<template>
    <div class="rsvp-success max-w-md mx-auto p-6 text-center">
      <h1 class="text-3xl font-bold mb-4">
        {{ successTitle }}
      </h1>
      <p class="mb-6">{{ successMessage }}</p>
      <div v-if="guest" class="mt-6 text-left">
        <p><strong>{{ t('rsvp.labelGuest') }}</strong> {{ guest.name }}</p>
        <p><strong>{{ t('rsvp.labelDietary') }}</strong> {{ guest.dietary || t('rsvp.notAvailable') }}</p>
        <p><strong>{{ t('rsvp.labelNotes') }}</strong> {{ guest.notes || t('rsvp.notAvailable') }}</p>
        <br v-if="guest.plus_one_name" />
        <p v-if="guest.plus_one_name"><strong>{{ t('rsvp.labelPlusOne') }}</strong> {{ guest.plus_one_name }}</p>
        <p v-if="guest.plus_one_name"><strong>{{ t('rsvp.labelPlusOneDietary') }}</strong> {{ guest.plus_one_dietary || t('rsvp.notAvailable') }}</p>
      </div>
      <router-link :to="{ name: 'home', params: { lang: route.params.lang } }" class="text-blue-600 underline">
        {{ t('rsvp.backHome') }}
      </router-link>
    </div>
  </template>
  
  <script setup>
  import { useRoute } from 'vue-router'
  import { useI18n } from 'vue-i18n'
  import { computed, ref, onMounted } from 'vue'
  import axios from 'axios'
  
  const route = useRoute()
  const { t } = useI18n()
  
  const guest = ref(null)
  
onMounted(async () => {
  try {
    console.log('➡️ Attempting to fetch guest data with code:', route.params.code)
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/rsvp/${encodeURIComponent(route.params.code)}`)
    console.log('📦 Full response:', JSON.stringify(response.data, null, 2))
    guest.value = response.data?.guest
    console.log('✅ Guest data fetched:', JSON.stringify(guest.value, null, 2))
  } catch (err) {
    console.error('❌ Error fetching guest data for code:', route.params.code, err)
  }
})
  
  const successTitle = computed(() => {
    if (!guest.value) return ''
    const prefix = t('rsvp.successTitlePrefix')
    const andText = t('rsvp.successTitleAnd')
    if (guest.value.attending && guest.value.plus_one_name) {
      return `${prefix} ${guest.value.name} ${andText} ${guest.value.plus_one_name}`
    }
    return `${prefix} ${guest.value.name}`
  })
  
  const successMessage = computed(() => {
    if (!guest.value) return ''
    return guest.value.attending
      ? t('rsvp.successMessageYes', {
          name: guest.value.name,
          plusOneName: guest.value.plus_one_name || ''
        })
      : t('rsvp.successMessageNo', { name: guest.value.name })
  })
  </script>
  
  <style scoped>
  .rsvp-success { margin-top: 4rem; }
  </style>