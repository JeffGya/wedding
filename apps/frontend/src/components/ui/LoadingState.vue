<!--
  LoadingState.vue

  Presentational loading indicator: centered CSS spinner (gold active
  segment) + label text. No business logic, no API calls.

  Usage:
    <LoadingState />
    <LoadingState label="Fetching guests…" />
-->
<script setup>
defineProps({
  label: {
    type: String,
    default: 'Loading …'
  }
});
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-16 py-48 font-sans">
    <span class="loading-spinner" aria-hidden="true"></span>
    <p class="loading-label">{{ label }}</p>
  </div>
</template>

<style scoped>
.loading-spinner {
  display: inline-block;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 3px solid var(--form-border, #DED4C4);
  border-top-color: #DAA520;
  animation: field-error-spin 0.8s linear infinite;
}

.loading-label {
  font-size: 0.875rem;
  color: #7A6B55;
}

@keyframes field-error-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
