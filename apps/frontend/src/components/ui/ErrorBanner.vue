

<script setup>
defineProps({
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'error', // 'error' or 'warning'
    validator: value => ['error', 'warning'].includes(value)
  }
});
</script>

<template>
  <div
    v-if="message"
    :class="[
      type === 'warning'
        ? 'bg-yellow-100 border-yellow-400 text-yellow-700'
        : 'bg-red-100 border-red-400 text-red-700',
      'px-4 py-3 rounded relative mb-4'
    ]"
    role="alert"
  >
    <strong class="font-bold">
      {{ type === 'warning' ? 'Warning' : 'Error' }}
    </strong>
    <span class="block sm:inline">{{ message }}</span>
  </div>
</template>