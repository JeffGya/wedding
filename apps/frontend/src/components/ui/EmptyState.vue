<!--
  EmptyState.vue

  Presentational empty-state block: neutral icon badge, headline,
  supporting text, and an optional CTA button. No business logic.

  Usage:
    <EmptyState title="No guests yet" description="Guests you add will show up here." />
    <EmptyState
      title="No messages"
      description="You haven't sent any messages."
      action-label="Compose message"
      @action="onCompose"
    />
-->
<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  actionLabel: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: 'i-solar:inbox-bold-duotone'
  }
});

defineEmits(['action']);
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-16 py-48 px-24 text-center font-sans">
    <span class="empty-icon-badge">
      <span :class="icon" class="text-2xl"></span>
    </span>
    <h3 class="empty-title">{{ title }}</h3>
    <p v-if="description" class="empty-description">{{ description }}</p>
    <Button
      v-if="actionLabel"
      :label="actionLabel"
      class="mt-8"
      @click="$emit('action')"
    />
  </div>
</template>

<style scoped>
.empty-icon-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: var(--card-bg, #E9E7D9);
  color: #7A6B55;
}

.empty-title {
  font-weight: 700;
  font-size: 1rem;
  color: var(--text);
}

.empty-description {
  font-size: 0.875rem;
  color: #7A6B55;
  max-width: 28rem;
}
</style>
