<template>
  <div class="rsvp-page">
    <ErrorBanner
      v-if="!settingsLoading && isClosed()"
      :message="t('rsvp.closed')"
    />
    <div v-else>
      <h1>{{ $t('rsvp.title') }}</h1>
      <ErrorBanner v-if="error" :message="error" />
      <div v-else-if="loading">{{ $t('rsvp.loading') }}</div>
      <RSVPForm
        v-else
        mode="public"
        :guest="guest"
        @submit="onSubmit"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { fetchGuestByCode, submitGuestRSVP } from '@/api/rsvp'
import ErrorBanner from '@/components/ui/ErrorBanner.vue'
import RSVPForm from '@/components/forms/RSVPForm.vue'
import { useGuestSettings } from '@/hooks/useGuestSettings'

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()
const { loading: settingsLoading, isClosed } = useGuestSettings()

const guest = ref(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  locale.value = route.params.lang
  try {
    guest.value = await fetchGuestByCode(route.params.code)
  } catch {
    error.value = t('rsvp.errorFetch')
  } finally {
    loading.value = false
  }
})

async function onSubmit(payload) {
  const { lang, code } = route.params
  try {
    await submitGuestRSVP(payload)
    router.push({ name: 'public-rsvp-success', params: { lang: route.params.lang, code: route.params.code } })
  } catch {
    error.value = t('rsvp.errorSubmit')
  }
}
</script>

<style scoped>
.rsvp-page {
  max-width: 600px;
  margin: 0 auto;
  padding: 1rem;
}
</style>