<template>
  <main class="md:w-1/2 mx-16 md:mx-auto lg:mx-auto">
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
        <h1 class="mb-16">{{ $t('rsvp.lookupTitle') }}</h1>
        <Card>
          <template #content>
              <Banner 
              v-if="error" 
              :message="error" 
              type="error" 
              />
            <Form @submit="submitLookup" class="space-y-8">
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
  </main>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { fetchGuestByCode } from '@/api/rsvp';
import Banner from '@/components/ui/Banner.vue';
import { useGuestSettings } from '@/hooks/useGuestSettings'
import FloatLabel from 'primevue/floatlabel';
import { useToastService } from '@/utils/toastService';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const { loading: settingsLoading, isClosed } = useGuestSettings()
const { showSuccess } = useToastService();

const code = ref('');
const error = ref('');
const submitting = ref(false);

async function submitLookup(event) {
  // Prevent default behavior if the event exists
  if (event && event.preventDefault) {
    event.preventDefault();
  }

  error.value = '';
  if (!code.value) return;
  submitting.value = true;
  try {
    await fetchGuestByCode(code.value.trim());
    showSuccess('Success', t('rsvp.lookupSuccess'), 5000);
    router.push({
      name: 'public-rsvp',
      params: { lang: route.params.lang, code: code.value.trim() }
    });
  } catch {
    error.value = t('rsvp.errorFetch');
  } finally {
    submitting.value = false;
    console.log('Error message:', error.value);
    console.log('Localized error message:', t('rsvp.errorFetch'));
  }
}
</script>

<style scoped>
</style>