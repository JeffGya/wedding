<template>
  <Dialog
    :visible="visible"
    modal
    class="w-96"
    :closable="false"
  >
    <template #header>
      <h3 class="text-xl font-semibold">Configure Button</h3>
    </template>

    <div class="space-y-4">
      <div>
        <label class="block text-sm font-semibold text-form-placeholder-text mb-2">
          Button Text
        </label>
        <InputText
          v-model="buttonText"
          placeholder="e.g., RSVP Now, View Details"
          class="w-full"
        />
      </div>

      <div>
        <label class="block text-sm font-semibold text-form-placeholder-text mb-2">
          Destination URL
        </label>
        <InputText
          v-model="buttonUrl"
          placeholder="e.g., /rsvp, https://example.com, #contact"
          class="w-full"
        />
        <small class="text-gray-500 text-xs mt-1">
          Use relative paths (e.g., /rsvp), full URLs, or anchor links (#section)
        </small>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          @click="handleCancel"
        />
        <Button
          label="Insert Button"
          severity="primary"
          @click="handleInsert"
          :disabled="!buttonText.trim() || !buttonUrl.trim()"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: Boolean
})

const emit = defineEmits(['close', 'insert'])

const buttonText = ref('')
const buttonUrl = ref('')

// Reset form when modal opens
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    buttonText.value = ''
    buttonUrl.value = ''
  }
})

function handleCancel() {
  emit('close')
}

function handleInsert() {
  if (buttonText.value.trim() && buttonUrl.value.trim()) {
    emit('insert', {
      text: buttonText.value.trim(),
      url: buttonUrl.value.trim()
    })
  }
}
</script>
