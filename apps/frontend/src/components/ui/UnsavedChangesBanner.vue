<!--
  UnsavedChangesBanner.vue

  Sticky banner shown at the top of a content area while a form has
  unsaved changes. Presentational only — pair with
  apps/frontend/src/composables/useUnsavedChanges.js in the consuming
  component (e.g. `v-if="isDirty"`).

  Usage:
    <UnsavedChangesBanner
      v-if="isDirty"
      @discard="onDiscard"
      @save="onSave"
    />
-->
<script setup>
defineEmits(['discard', 'save']);
</script>

<template>
  <div class="unsaved-banner font-sans">
    <span class="unsaved-banner__text">You have unsaved changes.</span>
    <div class="unsaved-banner__actions">
      <Button
        label="Discard"
        outlined
        severity="secondary"
        @click="$emit('discard')"
      />
      <Button
        label="Save changes"
        @click="$emit('save')"
      />
    </div>
  </div>
</template>

<style scoped>
.unsaved-banner {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #FCEFC7;
  border: 1px solid #E3B13F;
  border-radius: 10px;
}

.unsaved-banner__text {
  font-size: 0.875rem;
  font-weight: 600;
  color: #8A6A00;
}

.unsaved-banner__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
</style>
