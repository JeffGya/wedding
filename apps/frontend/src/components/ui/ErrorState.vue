<!--
  ErrorState.vue

  Presentational error-state block: red icon badge, headline,
  supporting text, and a Retry button. No business logic, no API calls
  — the parent is responsible for re-running its fetch on `retry`.

  Usage:
    <ErrorState description="Could not load guests." @retry="fetchGuests" />
    <ErrorState title="Failed to save" description="Please try again." @retry="onRetry" />
-->
<script setup>
defineProps({
  title: {
    type: String,
    default: 'Something went wrong'
  },
  description: {
    type: String,
    default: ''
  }
});

defineEmits(['retry']);
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-16 py-48 px-24 text-center font-sans">
    <span class="error-icon-badge">
      <span class="pi pi-exclamation-triangle text-lg" aria-hidden="true"></span>
    </span>
    <h3 class="error-title">{{ title }}</h3>
    <p v-if="description" class="error-description">{{ description }}</p>
    <Button
      label="Retry"
      class="mt-8"
      @click="$emit('retry')"
    />
  </div>
</template>

<style scoped>
.error-icon-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: #F3D9D6;
  color: #B3453B;
}

.error-title {
  font-weight: 700;
  font-size: 1rem;
  color: var(--text);
}

.error-description {
  font-size: 0.875rem;
  color: #7A6B55;
  max-width: 28rem;
}
</style>
