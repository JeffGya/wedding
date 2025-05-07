<template>
  <div class="rsvp-lookup max-w-md mx-auto p-6">
    <ErrorBanner v-if="error" :message="error" class="mb-4" />
    <h1 class="text-2xl font-semibold mb-4">{{ t('rsvp.lookupTitle') }}</h1>
    <form @submit.prevent="submitLookup" class="space-y-4">
      <div>
        <label for="code" class="block text-sm font-medium mb-1">{{ t('rsvp.lookupLabel') }}</label>
        <input
          id="code"
          v-model="code"
          type="text"
          required
          class="w-full border rounded px-3 py-2"
        />
      </div>
      <button
        type="submit"
        :disabled="loading"
        :class="{ 'opacity-50 cursor-not-allowed': loading }"
        class="w-full bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700"
      >
        {{ t('rsvp.lookupButton') }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { fetchGuestByCode } from '@/api/rsvp';
import ErrorBanner from '@/components/ui/ErrorBanner.vue';
import { useToast } from 'vue-toastification';

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
const toast = useToast();

const code = ref('');
const error = ref('');
const loading = ref(false);

async function submitLookup() {
  error.value = '';
  if (!code.value) return;
  loading.value = true;
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
    loading.value = false;
  }
}
</script>

<style scoped>
.rsvp-lookup {
  margin-top: 2rem;
}
</style>