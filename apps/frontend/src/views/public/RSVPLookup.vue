<template>
  <div class="rsvp-lookup max-w-md mx-auto p-6">
    <!-- Wait until settingsLoading is false -->
    <template v-if="!settingsLoading">
      <!-- Show closed banner if RSVP is closed -->
      <Banner
        v-if="isClosed()"
        :message="t('rsvp.closed')"
        class="mb-4"
        type="info"
      />
      <!-- Otherwise show lookup form -->
      <template v-else>
        <h1 class="text-2xl font-semibold mb-4">{{ t('rsvp.lookupTitle') }}</h1>
        <Card>
          <template #content>
              <Banner 
              v-if="error" 
              :message="error" 
              type="error" 
              />
            <Form @submit="submitLookup" class="space-y-4">
              <label for="code" class="block text-sm font-medium mb-1">{{ t('rsvp.lookupLabel') }}</label>
              <InputText
                id="code"
                v-model="code"
                type="text"
                required
                class="w-full border rounded px-3 py-2"
              />
              <Button
                type="submit"
                :disabled="submitting"
                :class="{ 'opacity-50 cursor-not-allowed': submitting }"
                class="w-full bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700"
              >
                {{ t('rsvp.lookupButton') }}
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
import { fetchGuestByCode } from '@/api/rsvp';
import Banner from '@/components/ui/Banner.vue';
import { useToast } from 'vue-toastification';
import { useGuestSettings } from '@/hooks/useGuestSettings'

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const { loading: settingsLoading, isClosed } = useGuestSettings()

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
    toast.success(t('rsvp.lookupSuccess'));
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
.rsvp-lookup {
  margin-top: 0rem;
}
</style>