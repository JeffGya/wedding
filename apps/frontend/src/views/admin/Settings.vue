<template>
  <AdminPageWrapper
    title="Settings"
    description="Manage site-wide settings such as email templates, contact info, and visibility options"
  >
    <UnsavedChangesBanner
      v-if="isDirty"
      class="mb-6"
      @discard="onDiscardAll"
      @save="onSaveAll"
    />

    <div>
      <ResendQuotaStatus />
      <MainSettings ref="mainSettingsRef" />
      <EmailSettings ref="emailSettingsRef" />
      <GuestSettings ref="guestSettingsRef" />
    </div>

    <LeaveConfirmModal
      :visible="!!pendingNavigation"
      @update:visible="(val) => { if (!val && pendingNavigation) resolveNavigation('stay') }"
      @stay="() => resolveNavigation('stay')"
      @discard="() => resolveNavigation('discard')"
      @save="async () => { await onSaveAll(); resolveNavigation('discard') }"
    />
  </AdminPageWrapper>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import AdminPageWrapper from '@/components/AdminPageWrapper.vue'
import EmailSettings from './settings/EmailSettings.vue'
import GuestSettings from './settings/GuestSettings.vue'
import MainSettings from './settings/MainSettings.vue'
import ResendQuotaStatus from '@/components/ui/ResendQuotaStatus.vue'
import UnsavedChangesBanner from '@/components/ui/UnsavedChangesBanner.vue'
import LeaveConfirmModal from '@/components/ui/LeaveConfirmModal.vue'
import { useUnsavedChanges } from '@/composables/useUnsavedChanges'

const mainSettingsRef = ref(null)
const emailSettingsRef = ref(null)
const guestSettingsRef = ref(null)

const { isDirty, markDirty, markClean, pendingNavigation, resolveNavigation } = useUnsavedChanges()

const childRefs = computed(() => [mainSettingsRef.value, emailSettingsRef.value, guestSettingsRef.value].filter(Boolean))

const anyChildDirty = computed(() => childRefs.value.some((child) => child.isDirty))

watch(anyChildDirty, (dirty) => {
  if (dirty) {
    markDirty()
  } else {
    markClean()
  }
})

function syncDirtyState() {
  if (anyChildDirty.value) {
    markDirty()
  } else {
    markClean()
  }
}

async function onSaveAll() {
  const dirtyChildren = childRefs.value.filter((child) => child.isDirty)
  await Promise.all(dirtyChildren.map((child) => child.save()))
  syncDirtyState()
}

async function onDiscardAll() {
  const dirtyChildren = childRefs.value.filter((child) => child.isDirty)
  await Promise.all(dirtyChildren.map((child) => child.reset()))
  syncDirtyState()
}
</script>
