<script setup>
import { computed } from 'vue';

// Define props
const props = defineProps({
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'error', // 'success', 'info', 'warn', or 'error'
    validator: value => ['success', 'info', 'warn', 'error'].includes(value)
  }
});

// Map specific icons for each type
const iconClass = computed(() => {
  // Access `type` from `props`
  return {
    success: 'i-solar:check-square-bold', // Success icon
    info: 'i-solar:info-square-bold', // Info icon
    warn: 'i-solar:danger-square-bold', // Warning icon
    error: 'i-solar:confounded-square-bold' // Error icon
  }[props.type] || ''; // Fallback to an empty string if `type` is invalid
});
</script>

<template>
  <Message
    v-if="message"
    :severity="type"
    :icon="iconClass"
  >
    {{ message }}
  </Message>
</template>