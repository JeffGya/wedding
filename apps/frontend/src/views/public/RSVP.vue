<template>
  <main class="md:w-1/2 mx-16 md:mx-auto lg:mx-auto mb-40 lg:mb-80">
    <Banner
      v-if="!settingsLoading && isClosed()"
      :message="$t('rsvp.closed')"
    />
    <div v-else>
      <h1 class="mb-16">{{ $t('rsvp.title') }}</h1>
      <Card> 
        <template #content>
          <Banner v-if="error" :message="error" />
          <div v-else-if="loading">{{ $t('rsvp.loading') }}</div>
          <RSVPForm
            v-else-if="guest"
            mode="public"
            :guest="guest"
            @submit="onSubmit"
          />
        </template>
      </Card>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { submitGuestRSVP } from '@/api/rsvp'
import Banner from '@/components/ui/Banner.vue'
import RSVPForm from '@/components/forms/RSVPForm.vue'
import { useGuestSettings } from '@/hooks/useGuestSettings'
import { useGuestSession } from '@/composables/useGuestSession'
import { useRSVPLookup } from '@/composables/useRSVPLookup'
import { useErrorHandler } from '@/composables/useErrorHandler'

const route = useRoute()
const router = useRouter()
const { locale, t } = useI18n()
const { loading: settingsLoading, isClosed } = useGuestSettings()
const { session, hasSession, sessionCode, loadSession } = useGuestSession({ autoLoad: true, showLoader: false })
const { handleError } = useErrorHandler({ showToast: false, showBanner: true })

// Use RSVP lookup composable
const { guest: lookupGuestState, loading: lookupLoading, lookupGuest, error: lookupError } = useRSVPLookup({
  showLoader: false
})

// Combine error states
const error = computed(() => lookupError.value || '')
const loading = computed(() => lookupLoading.value)
const guest = computed(() => lookupGuestState.value)

// Auto-redirect if a valid RSVP session exists (has a code)
onMounted(async () => {
  locale.value = route.params.lang
  
  // Load session first
  await loadSession()
  
  // If session has code, use it; otherwise use route param
  let codeToUse = route.params.code
  if (hasSession.value && sessionCode.value) {
    codeToUse = sessionCode.value
    // If route param doesn't match session, update route
    if (route.params.code !== sessionCode.value) {
      router.replace({
        name: 'public-rsvp',
        params: { lang: route.params.lang, code: sessionCode.value }
      })
    }
  }
  
  // If no code available, redirect to lookup
  if (!codeToUse) {
    router.replace({ name: 'public-rsvp-lookup', params: { lang: route.params.lang } })
    return
  }
  
  // Lookup guest by code
  await lookupGuest(codeToUse)
})

async function onSubmit(payload) {
  try {
    await submitGuestRSVP(payload)
    router.push({ name: 'public-rsvp-success', params: { lang: route.params.lang, code: route.params.code } })
  } catch (err) {
    handleError(err, t('rsvp.errorSubmit'))
  }
}
</script>

<style scoped>
</style>