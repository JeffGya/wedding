<template>
  <ProgressBar
    v-if="isLoading"
    mode="indeterminate"
    class="fixed top-0 left-0 w-full z-50 h-1"
  />
</template>

<script setup>
import { computed } from 'vue';
import ProgressBar from 'primevue/progressbar';
import { useLoaderStore } from '@/store/loader';

const loader = useLoaderStore();
const isLoading = computed(() => loader.isLoading);
</script>

<style scoped>
/* Full-width fixed overlay track */
.p-progressbar {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 4px !important;
  z-index: 9999 !important;
  background-color: var(--ac-hover) !important;
  opacity: 0.8 !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
}
/* Indeterminate bar fill color */
.p-progressbar .p-progressbar-value {
  background-color: var(--ac-base) !important;
}
</style>
