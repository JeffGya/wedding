<template>
  <div class="px-16 md:px-40 lg:px-80 md:w-1/2 md:mx-auto lg:mx-auto">
    <h1 class="mt-0 md:mt-16 mb-16">{{ $t('rsvpGate.title', 'Access Required') }}</h1>
    
    <Card>
      <template #content>
        <!-- Access Denied Banner -->
        <Banner
          type="warn"
          :message="$t('rsvpGate.accessDeniedMessage')"
          class="mb-24"
        />

        <!-- No session: prompt for code lookup inline -->
        <div v-if="reason === 'no_session'">
          <Banner
            v-if="error"
            type="error"
            :message="error"
          />
          <Form :model="form" @submit="submitCode" class="space-y-16">
            <p class="-mt-4 text-txt">{{ $t('rsvpGate.pageRequiresAttending') }} {{ $t('rsvpGate.enterCodePrompt') }}</p>
            <FloatLabel variant="in">
              <InputText
                id="rsvp-gate-code"
                v-model="form.code"
                type="text"
                required
                class="w-full"
              />
              <label for="rsvp-gate-code">
                {{ $t('rsvp.lookupLabel') }}
              </label>
            </FloatLabel>
            
            <Button
              type="submit"
              class="w-full md:w-auto"
              size="large"
              :disabled="!form.code.trim() || submitting"
              :label="$t('rsvpGate.verifyButton')"
              aria-label="Verify RSVP code"
              icon="i-solar:magnifer-linear"
            />
          </Form>
        </div>

        <!-- Pending RSVP: show message and link to complete RSVP -->
        <div v-else-if="reason === 'pending'" class="space-y-16">
          <p class="text-txt font-medium">{{ $t('rsvpGate.pendingRSVP') }}</p>
          
          <div v-if="!isClosed()">
            <Button
              :label="$t('rsvpGate.completeRSVP')"
              icon="i-solar:user-check-bold"
              @click="goToFullRsvp"
              class="w-full md:w-auto"
              size="large"
            />
          </div>

          <Banner
            v-else
            type="info"
            :message="$t('rsvp.closed')"
          />
        </div>

        <!-- Not attending: show warning and RSVP link if open -->
        <div v-else-if="reason === 'not_attending'" class="space-y-16">
          <p class="text-txt font-medium">{{ $t('rsvpGate.notAttending') }}</p>

          <div v-if="!isClosed()">
            <Button
              :label="$t('rsvpGate.updateRSVP')"
              icon="i-solar:refresh-cw-bold"
              @click="goToFullRsvp"
              class="w-full md:w-auto"
              size="large"
            />
          </div>

          <Banner
            v-else
            type="info"
            :message="$t('rsvpGate.updateClosed')"
          />
        </div>

        <!-- Unknown reason: fallback -->
        <div v-else class="space-y-16">
          <p class="text-txt font-medium">{{ $t('rsvpGate.accessDenied') }}</p>
          <p class="text-txt">{{ $t('rsvpGate.accessDeniedMessage') }}</p>
          
          <div v-if="!isClosed()">
            <Button
              :label="$t('rsvpGate.completeRSVP')"
              icon="i-solar:user-check-bold"
              @click="goToFullRsvp"
              class="w-full md:w-auto"
              size="large"
            />
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Banner from '@/components/ui/Banner.vue';
import FloatLabel from 'primevue/floatlabel';
import Button from 'primevue/button';
import Card from 'primevue/card';
import { useGuestSettings } from '@/hooks/useGuestSettings';
import { useGuestSession } from '@/composables/useGuestSession';
import { useRSVPLookup } from '@/composables/useRSVPLookup';

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
const { sessionCode, refreshSession } = useGuestSession({ autoLoad: false, showLoader: false });

// Form model for PrimeVue Form
const form = reactive({
  code: ''
});

// Use RSVP lookup composable
const { error, submitting, lookupGuest } = useRSVPLookup({
  showLoader: false,
  onSuccess: async (guest, codeValue) => {
    // Refresh session to pick up the new code
    await refreshSession();
    // On success, fully reload the current route to pick up the new session
    window.location.href = props.redirectPath;
  }
});

async function submitCode() {
  await lookupGuest(form.code);
}

function goToFullRsvp() {
  // Use session code if available
  const codeToUse = sessionCode.value;
  if (!codeToUse) {
    // No session code: redirect to the RSVP lookup page
    router.push({ name: 'public-rsvp-lookup', params: { lang: locale.value } });
    return;
  }
  // Have a code: navigate to the full RSVP form
  router.push({
    name: 'public-rsvp',
    params: { lang: locale.value, code: codeToUse }
  });
}
</script>