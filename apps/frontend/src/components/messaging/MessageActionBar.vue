

<template>
    <Button
      label="Save Draft"
      icon="i-solar:inbox-in-bold-duotone"
      severity="secondary"
      @click="$emit('save')"
    />

    <Button
      label="Schedule"
      icon="i-solar:mailbox-bold-duotone"
      severity="info"
      @click="$emit('schedule')"
    />

    <Button
      label="Save as Template"
      icon="i-solar:letter-bold-duotone"
      severity="Help"
      @click="$emit('openTemplateModal')"
    />

    <Button
      label="Send Now"
      icon="i-solar:plain-2-bold-duotone"
      @click="$emit('sendNow')"
    />

</template>

<script setup>
defineEmits(['save', 'schedule', 'sendNow', 'openTemplateModal'])
</script>