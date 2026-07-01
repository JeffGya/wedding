<!--
  LeaveConfirmModal.vue

  PrimeVue Dialog with three actions for the unsaved-changes navigation
  guard: Stay (safe default), Discard & leave (destructive/outlined red),
  Save & leave (primary). Pair with
  apps/frontend/src/composables/useUnsavedChanges.js — e.g.:

    <LeaveConfirmModal
      v-model:visible="showLeaveModal"
      @stay="resolveNavigation('stay')"
      @discard="resolveNavigation('discard')"
      @save="async () => { await onSave(); resolveNavigation('save'); }"
    />

  Uses PrimeVue's own `Dialog` rather than the ConfirmDialog wrapper from
  useConfirmDialog.js, because this needs three distinct actions instead
  of a binary accept/reject.
-->
<script setup>
const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:visible', 'stay', 'discard', 'save']);

function onStay() {
  emit('stay');
}

function onDiscard() {
  emit('discard');
}

function onSave() {
  emit('save');
}
</script>

<template>
  <Dialog
    :visible="props.visible"
    modal
    :closable="true"
    :draggable="false"
    header="Unsaved changes"
    class="leave-confirm-modal font-sans"
    style="width: 28rem"
    @update:visible="(val) => emit('update:visible', val)"
  >
    <p class="leave-confirm-modal__message">
      You have unsaved changes. What would you like to do before leaving this page?
    </p>

    <template #footer>
      <div class="leave-confirm-modal__actions">
        <Button
          label="Stay"
          severity="secondary"
          @click="onStay"
        />
        <Button
          label="Discard & leave"
          outlined
          class="leave-confirm-modal__discard"
          @click="onDiscard"
        />
        <Button
          label="Save & leave"
          @click="onSave"
        />
      </div>
    </template>
  </Dialog>
</template>

<style scoped>
.leave-confirm-modal__message {
  font-size: 0.875rem;
  color: var(--text);
}

.leave-confirm-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.leave-confirm-modal__discard {
  color: #B3453B !important;
  border-color: #B3453B !important;
}
</style>
