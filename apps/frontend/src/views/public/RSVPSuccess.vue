<template>
    <main class="md:w-1/2 mx-16 md:mx-auto lg:mx-auto">
      <h1 class="mb-16">
        {{ successTitle }}
      </h1>
      <Card>
        <template #content>
          <p class="mt-0">{{ successMessage }}</p>
          <div class="mb-16" v-if="guest">
            <p class="m-0 my-4"><span class="font-600">{{ $t('rsvp.labelGuest') }}:</span> {{ guest.name }}</p>
            <template v-if="guest.attending">
              <p class="m-0 my-4"><span class="font-bold">{{ $t('rsvp.labelDietary') }}:</span> {{ guest.dietary || $t('rsvp.notAvailable') }}</p>
              <p class="m-0 my-4"><span class="font-medium">{{ $t('rsvp.labelNotes') }}:</span> {{ guest.notes || $t('rsvp.notAvailable') }}</p>
              <br v-if="guest.plus_one_name" />
              <p class="m-0 my-4" v-if="guest.plus_one_name"><span class="font-medium">{{ $t('rsvp.labelPlusOne') }}:</span> {{ guest.plus_one_name }}</p>
              <p class="m-0 my-4" v-if="guest.plus_one_name"><span class="font-medium">{{ $t('rsvp.labelPlusOneDietary') }}:</span> {{ guest.plus_one_dietary || $t('rsvp.notAvailable') }}</p>
            </template>
          </div>
          
          <Button
          asChild
          size="large"
          v-slot="slotProps"
          >
          <router-link class="no-underline" :to="{ name: 'home', params: { lang: route.params.lang } }" :class="slotProps.class">
            {{ $t('rsvp.backHome') }}
          </router-link>
          </Button>
        </template>
      </Card>

    </main>
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
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/rsvp/${encodeURIComponent(route.params.code)}`)
    guest.value = response.data?.guest
  } catch (err) {
    console.error('Error fetching guest data:', err)
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
  main {
    white-space: pre-line;
  }
  </style>