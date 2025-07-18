<template>
  <div v-if="enabled && targetDate" class="wedding-countdown text-center my-24 p-16 md:mx-auto md:w-1/2 rounded-md backdrop-blur-md">
    <p class="font-serif font-400 text-lg mt-0 mb-16">August 1st, 2026 — Vilnius, Lithuania </p>
    <p class="font-serif font-600 text-3xl mt-0 mb-16
    ">
      {{ months }} {{ t('home.countdown.months', { count: months }) }}
      {{ days }} {{ t('home.countdown.days', { count: days }) }}
    </p>
    <p class="font-serif m-0">
      {{ t('home.countdown.label') }}
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import api from '@/api';

const enabled = ref(false);
const targetDate = ref(null);
const now = ref(new Date());
let timer = null;

onMounted(async () => {
  try {
    const { data } = await api.get('/settings/main');
    enabled.value = data.enableGlobalCountdown;
    targetDate.value = data.weddingDate
      ? new Date(data.weddingDate)
      : null;

    if (enabled.value && targetDate.value) {
      // Update once a day at midnight
      const updateNow = () => { now.value = new Date(); };
      updateNow();
      // Calculate milliseconds until next local midnight
      const nextMidnight = new Date(
        now.value.getFullYear(),
        now.value.getMonth(),
        now.value.getDate() + 1,
        0, 0, 0
      );
      const msUntilMidnight = nextMidnight - now.value;
      // First update at midnight, then every 24 hours
      timer = setTimeout(() => {
        updateNow();
        timer = setInterval(updateNow, 24 * 60 * 60 * 1000);
      }, msUntilMidnight);
    }
  } catch (err) {
    console.error('Failed to load countdown settings', err);
  }
});

onUnmounted(() => {
  if (timer) {
    clearTimeout(timer);
    clearInterval(timer);
  }
});

// Pure-JS calculation of full months and remaining days between two dates
function calculateMonthsAndDays(from, to) {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  // Adjust if the day-of-month hasn't been reached yet
  if (to.getDate() < from.getDate()) {
    months--;
  }
  // Calculate days after subtracting full months
  const afterMonths = new Date(from.getFullYear(), from.getMonth() + months, from.getDate());
  const diffMs = to - afterMonths;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return { months, days };
}

const months = computed(() => {
  if (!enabled.value || !targetDate.value) return 0;
  return calculateMonthsAndDays(now.value, targetDate.value).months;
});

const days = computed(() => {
  if (!enabled.value || !targetDate.value) return 0;
  return calculateMonthsAndDays(now.value, targetDate.value).days;
});

const { t } = useI18n();
</script>

<style scoped>
.wedding-countdown{
  color: var(--int-base);
  background: var(--bg-glass);
  border: 1px solid var(--bg-glass-border);
}
</style>
