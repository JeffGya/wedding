<template>
  <div class="p-6">
    <h1 class="text-3xl font-bold text-gray-800 mb-6">New Message</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Composer Section -->
      <div>
        <h2 class="text-xl font-semibold text-gray-700 mb-2">Message Composer</h2>
        <!-- Will mount MessageComposer.vue here -->
        <MessageComposer />
      </div>

      <!-- Recipient Picker Section -->
      <div>
        <h2 class="text-xl font-semibold text-gray-700 mb-2">Recipients</h2>
        <!-- Will mount RecipientPicker.vue here -->
        <RecipientPicker />
      </div>
    </div>
  </div>
</template>

<script setup>
import MessageComposer from '@/components/messaging/MessageComposer.vue'
import RecipientPicker from '@/components/messaging/RecipientPicker.vue'
</script>

<style scoped>
/* Optional scoped styles can be added here later */
</style>