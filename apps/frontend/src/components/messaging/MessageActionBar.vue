

<template>
  <div class="flex flex-wrap gap-2">
    <Button
      label="Save Draft"
      icon="pi pi-save"
      severity="secondary"
      @click="$emit('save')"
    />

    <Button
      label="Schedule"
      icon="pi pi-calendar"
      severity="info"
      @click="$emit('schedule')"
    />

    <Button
      label="Save as Template"
      icon="pi pi-file-edit"
      severity="help"
      @click="$emit('openTemplateModal')"
    />

    <Button
      label="Send Now"
      icon="pi pi-send"
      severity="success"
      @click="$emit('sendNow')"
    />
  </div>
</template>

<script setup>
defineEmits(['save', 'schedule', 'sendNow', 'openTemplateModal'])
</script>