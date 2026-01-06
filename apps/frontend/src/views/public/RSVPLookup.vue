<template>
  <div class="px-16 md:px-40 lg:px-80 md:w-1/2 md:mx-auto lg:mx-auto">
    <!-- Wait until settingsLoading is false -->
    <template v-if="!settingsLoading">
      <!-- Show closed banner if RSVP is closed -->
      <Banner
        v-if="isClosed()"
        :message="$t('rsvp.closed')"
        class="mb-8"
        type="info"
      />
      <!-- Otherwise show lookup form -->
      <template v-else>
        <h1 class="mt-0 md:mt-16 mb-16">{{ $t('rsvp.lookupTitle') }}</h1>
        <Card>
          <template #content>
              <Banner 
              v-if="error" 
              :message="error" 
              type="error" 
              />
            <Form @submit="submitLookup" class="space-y-8">
                <p class="-mt-4 text-txt">{{ $t('rsvp.lookupDescription') }}</p>
              <FloatLabel variant="in">
                <InputText
                  id="lookup-code"
                  v-model="code"
                  type="text"
                  required
                />
                <label for="lookup-code">
                  {{ $t('rsvp.lookupLabel') }}
                </label>
              </FloatLabel>
              <Button
                type="submit"
                class="w-full md:w-auto"
                size="large"
                :disabled="submitting"
                :label="$t('rsvp.lookupButton')"
                aria-label="Lookup RSVP" 
                icon="i-solar:magnifer-linear"
              >
              </Button>
            </Form>
          </template>
        </Card>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Banner from '@/components/ui/Banner.vue';
import { useGuestSettings } from '@/hooks/useGuestSettings'
import FloatLabel from 'primevue/floatlabel';
import { useToastService } from '@/utils/toastService';
import { useRSVPLookup } from '@/composables/useRSVPLookup';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const { loading: settingsLoading, isClosed } = useGuestSettings()
const { showSuccess } = useToastService();

const code = ref('');

// Use RSVP lookup composable
const { submitting, error, lookupGuest } = useRSVPLookup({
  showLoader: false,
  onSuccess: (guest, codeValue) => {
    showSuccess('Success', t('rsvp.lookupSuccess'), 5000);
    router.push({
      name: 'public-rsvp',
      params: { lang: route.params.lang, code: codeValue }
    });
  }
});

async function submitLookup(event) {
  // Prevent default behavior if the event exists
  if (event && event.preventDefault) {
    event.preventDefault();
  }

  if (!code.value) return;
  await lookupGuest(code.value);
}
</script>

<style scoped>
</style>