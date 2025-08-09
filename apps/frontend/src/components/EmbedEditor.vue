<template>
  <div class="embed-editor space-y-16">
    <div class="space-y-8">
      <label class="text-txt font-medium block">Embed Code or URL</label>
      <InputText
        v-model="rawInput"
        placeholder="Paste iframe code or URL here..."
        class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
      />
    </div>
    
    <div class="space-y-8">
      <Button 
        label="Normalize Embed" 
        icon="pi pi-cog"
        class="bg-btn-secondary-base hover:bg-btn-secondary-hover active:bg-btn-secondary-active text-btn-secondary-text"
        @click="applyEmbed" 
      />
    </div>
    
    <div v-if="iframe" class="preview-container">
      <div class="preview-header">
        <span class="text-txt font-medium">Preview</span>
      </div>
      <div class="preview-content" v-html="iframe"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const rawInput = ref(props.modelValue)
const iframe = ref('')

watch(
  () => props.modelValue,
  (v) => {
    rawInput.value = v
    iframe.value = v
  }
)

function applyEmbed() {
  let code = rawInput.value.trim()
  // If it's just a URL, wrap into a basic iframe
  if (!code.startsWith('<iframe')) {
    code = `<iframe src="${code}" width="100%" height="360" frameborder="0" allowfullscreen></iframe>`
  }
  iframe.value = code
  emit('update:modelValue', code)
}
</script>

<style scoped>
.embed-editor {
  width: 100%;
}

.preview-container {
  border: 1px solid var(--form-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--form-bg);
}

.preview-header {
  background: var(--form-bg-hover);
  padding: 12px 16px;
  border-bottom: 1px solid var(--form-border);
}

.preview-content {
  padding: 16px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-content iframe {
  max-width: 100%;
  border-radius: 4px;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .preview-content {
    padding: 12px;
    min-height: 150px;
  }
}
</style>