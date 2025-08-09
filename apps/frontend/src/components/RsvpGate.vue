<template>
  <div class="rsvp-gate">
    <!-- Access Denied Banner -->
    <Banner
      type="warn"
      :message="$t('rsvpGate.accessDeniedMessage')"
      class="mb-6"
    />

    <!-- No session: prompt for code lookup inline -->
    <div v-if="reason === 'no_session'" class="mt-6">
      <p class="text-lg font-medium mb-4">{{ $t('rsvpGate.pageRequiresAttending') }}</p>
      <p class="mb-4">{{ $t('rsvpGate.enterCodePrompt') }}</p>
      <div class="flex items-center mt-4 space-x-2">
        <InputText
          v-model="code"
          :placeholder="$t('rsvp.lookupLabel')"
          @keyup.enter="submitCode"
          class="flex-1"
        />
        <Button
          :label="$t('rsvpGate.verifyButton')"
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

    <!-- Pending RSVP: show message and link to complete RSVP -->
    <div v-else-if="reason === 'pending'" class="mt-6 space-y-4">
      <p class="text-lg font-medium">{{ $t('rsvpGate.pendingRSVP') }}</p>
      
      <div v-if="!isClosed()">
        <Button
          :label="$t('rsvpGate.completeRSVP')"
          icon="i-solar:user-check-bold"
          @click="goToFullRsvp"
          class="w-full md:w-auto"
        />
      </div>

      <Banner
        v-else
        type="info"
        :message="$t('rsvp.closed')"
      />
    </div>

    <!-- Not attending: show warning and RSVP link if open -->
    <div v-else-if="reason === 'not_attending'" class="mt-6 space-y-4">
      <p class="text-lg font-medium">{{ $t('rsvpGate.notAttending') }}</p>

      <div v-if="!isClosed()">
        <Button
          :label="$t('rsvpGate.updateRSVP')"
          icon="i-solar:refresh-cw-bold"
          @click="goToFullRsvp"
          class="w-full md:w-auto"
        />
      </div>

      <Banner
        v-else
        type="info"
        :message="$t('rsvpGate.updateClosed')"
      />
    </div>

    <!-- Unknown reason: fallback -->
    <div v-else class="mt-6 space-y-4">
      <p class="text-lg font-medium">{{ $t('rsvpGate.accessDenied') }}</p>
      <p>{{ $t('rsvpGate.accessDeniedMessage') }}</p>
      
      <div v-if="!isClosed()">
        <Button
          :label="$t('rsvpGate.completeRSVP')"
          icon="i-solar:user-check-bold"
          @click="goToFullRsvp"
          class="w-full md:w-auto"
        />
      </div>
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
  padding: 0 1rem;
}
</style>