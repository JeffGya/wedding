<!--
  SettingsSection.vue

  Presentational section-card wrapper used across the Settings screen
  (MainSettings, EmailSettings, GuestSettings) so every section looks
  like part of the same page instead of stapled-together sub-pages.
  No business logic, no API calls.

  Usage:
    <SettingsSection title="Basic Settings">
      ...fields...
    </SettingsSection>

    <SettingsSection title="Resend Quota Status" description="...">
      ...content...
    </SettingsSection>
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
  }
});
</script>

<template>
  <div class="bg-card-bg border border-form-border rounded-[10px] p-[22px] mb-[18px] font-sans">
    <div class="text-base font-bold text-txt mb-1">{{ title }}</div>
    <p v-if="description" class="text-[13px] text-[#7A6B55] mb-[18px]">{{ description }}</p>
    <slot />
  </div>
</template>
