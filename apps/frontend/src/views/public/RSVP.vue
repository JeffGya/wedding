<template>
  <main class="md:w-1/2 mx-16 md:mx-auto lg:mx-auto">
    <Banner
      v-if="!settingsLoading && isClosed()"
      :message="t('rsvp.closed')"
    />
    <div v-else>
      <h1 class="mb-16">{{ $t('rsvp.title') }}</h1>
      <Card> 
        <template #content>
          <Banner v-if="error" :message="error" />
          <div v-else-if="loading">{{ $t('rsvp.loading') }}</div>
          <RSVPForm
            v-else
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
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { fetchGuestByCode, submitGuestRSVP } from '@/api/rsvp'
import Banner from '@/components/ui/Banner.vue'
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
</style>