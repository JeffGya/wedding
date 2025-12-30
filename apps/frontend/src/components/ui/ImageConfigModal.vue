<template>
  <Dialog
    :visible="visible"
    modal
    class="w-96"
    :closable="false"
  >
    <template #header>
      <h3 class="text-xl font-semibold">Configure Image</h3>
    </template>

    <div class="space-y-4">
      <div v-if="imageSrc" class="mb-4">
        <img :src="imageSrc" alt="Preview" class="max-w-full h-auto rounded border" />
      </div>

      <div>
        <label class="block text-sm font-semibold text-form-placeholder-text mb-2">
          Width
        </label>
        <InputText
          v-model="width"
          placeholder="e.g., 300px, 50%, auto"
          class="w-full"
        />
        <small class="text-gray-500 text-xs mt-1">
          Enter width (e.g., 300px, 50%, or leave empty for auto)
        </small>
      </div>

      <div>
        <label class="block text-sm font-semibold text-form-placeholder-text mb-2">
          Height
        </label>
        <InputText
          v-model="height"
          placeholder="e.g., 200px, auto"
          class="w-full"
        />
        <small class="text-gray-500 text-xs mt-1">
          Enter height (e.g., 200px, or leave empty for auto)
        </small>
      </div>

      <div>
        <label class="block text-sm font-semibold text-form-placeholder-text mb-2">
          Alignment
        </label>
        <Select
          v-model="align"
          :options="alignOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
          placeholder="Select alignment"
        />
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
          label="Apply"
          severity="primary"
          @click="handleApply"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  visible: Boolean,
  imageSrc: String,
  currentWidth: String,
  currentHeight: String,
  currentAlign: String
})

const emit = defineEmits(['close', 'apply'])

const width = ref('')
const height = ref('')
const align = ref('')

const alignOptions = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
  { label: 'None', value: '' }
]

// Reset form when modal opens
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    width.value = props.currentWidth || ''
    height.value = props.currentHeight || ''
    align.value = props.currentAlign || ''
  }
})

function handleCancel() {
  emit('close')
}

function handleApply() {
  emit('apply', {
    width: width.value.trim() || undefined,
    height: height.value.trim() || undefined,
    align: align.value || undefined
  })
}
</script>

