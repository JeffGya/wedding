<template>
  <div class="rsvp-gate">
    <!-- No session: prompt for code lookup inline -->
    <div v-if="reason === 'no_session'" class="mt-6">
      <!-- Informational banner for no-session (requires code) -->
      <Banner
        type="info"
        :message="$t('rsvp.pageRequiresAttending')"
      />
      <p>{{ $t('rsvp.enterCodePrompt') }}</p>
      <div class="flex items-center mt-4 space-x-2">
        <InputText
          v-model="code"
          :placeholder="$t('rsvp.lookupLabel')"
          @keyup.enter="submitCode"
        />
        <Button
          :label="$t('rsvp.verifyButton')"
          icon="i-solar:magnifer-linear"
          @click="submitCode"
          :disabled="!code.trim()"
        />
      </div>
      <Banner
        v-if="error"
        type="error"
        :message="error"
        class="mt-4"
      />
    </div>

    <!-- Not attending: show warning and RSVP link if open -->
    <div v-else-if="reason === 'not_attending'" class="mt-6 space-y-4">
      <Banner
        type="warn"
        :message="$t('rsvp.notAttending')"
      />

      <div v-if="!isClosed()">
        <Button
          :label="$t('rsvp.updateRSVP')"
          icon="i-solar:refresh-cw-bold"
          @click="goToFullRsvp"
        />
      </div>

      <Banner
        v-else
        type="info"
        :message="$t('rsvp.updateClosed')"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Banner from '@/components/ui/Banner.vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { fetchGuestByCode } from '@/api/rsvp';
import { useGuestSettings } from '@/hooks/useGuestSettings';

// Props passed from PageView
const props = defineProps({
  reason: {
    type: String,
    required: true,
  },
  redirectPath: {
    type: String,
    required: true,
  },
});

const { locale, t } = useI18n();
const router = useRouter();
const { isClosed } = useGuestSettings();

const code = ref('');
const error = ref('');

async function submitCode() {
  error.value = '';
  try {
    await fetchGuestByCode(code.value.trim());
    localStorage.setItem('rsvp_code', code.value.trim());
    // on success, fully reload the current route to pick up the new session
    window.location.href = props.redirectPath;
  } catch {
    error.value = t('rsvp.errorFetch');
  }
}

function goToFullRsvp() {
  const savedCode = localStorage.getItem('rsvp_code');
  if (!savedCode) {
    // No stored code: redirect to the RSVP lookup page
    router.push({ name: 'public-rsvp-lookup', params: { lang: locale.value } });
    return;
  }
  // Have a code: navigate to the full RSVP form
  router.push({
    name: 'public-rsvp',
    params: { lang: locale.value, code: savedCode }
  });
}
</script>

<style scoped>
.rsvp-gate {
  max-width: 480px;
  margin: 2rem auto;
}
</style>