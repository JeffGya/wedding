

<template>
    <button class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600" @click="$emit('save')">Save Draft</button>
    <button class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" @click="$emit('schedule')">Schedule</button>
    <button class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" @click="$emit('sendNow')">Send Now</button>
    <button class="border border-gray-400 px-4 py-2 rounded hover:bg-gray-100" @click="$emit('openTemplateModal')">Save as Template</button>
</template>

<script setup>
defineEmits(['save', 'schedule', 'sendNow', 'openTemplateModal'])
</script>