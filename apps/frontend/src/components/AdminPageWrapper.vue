<template>
  <div class="admin-page">
    <!-- Page Header -->
    <div class="admin-header mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-4xl font-semibold text-[var(--int-base)] mb-2">{{ title }}</h1>
          <p v-if="description" class="text-text">{{ description }}</p>
        </div>
        <div v-if="$slots.headerActions" class="flex flex-wrap gap-2">
          <slot name="headerActions" />
        </div>
      </div>
    </div>

    <!-- Page Content -->
    <div class="page-content">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  }
});
</script>

<style scoped>
.admin-page {
  @apply max-w-none;
}

.admin-header {
  @apply border-b border-form-border pb-4;
}

.page-content {
  @apply space-y-6;
}
</style> 