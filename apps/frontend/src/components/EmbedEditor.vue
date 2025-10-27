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
        icon="i-solar:settings-minimalistic-bold-duotone"
        size="normal"
        severity="secondary"
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
import { ref, watch, onMounted, nextTick } from 'vue'

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
  
  // Check if it's already a blockquote embed (Instagram, etc.)
  // or if it's already a valid iframe, or other embed markup
  if (code.startsWith('<blockquote') || 
      code.startsWith('<iframe') ||
      code.startsWith('<div') ||
      code.includes('<script')) {
    // Already valid embed code, use as-is
    iframe.value = code
    emit('update:modelValue', code)
    
    // Process Instagram embeds in preview
    if (code.includes('instagram-media')) {
      nextTick(() => {
        processInstagramEmbeds()
      })
    }
    return
  }
  
  // If it's just a URL, wrap into a basic iframe
  if (/^https?:\/\//i.test(code)) {
    code = `<iframe src="${code}" width="100%" height="360" frameborder="0" allowfullscreen></iframe>`
  }
  
  iframe.value = code
  emit('update:modelValue', code)
}

async function processInstagramEmbeds() {
  await nextTick()
  
  if (!window.instgrm) {
    const script = document.createElement('script')
    script.src = 'https://www.instagram.com/embed.js'
    script.async = true
    document.head.appendChild(script)
    
    script.onload = () => {
      setTimeout(() => {
        if (window.instgrm?.Embeds) {
          window.instgrm.Embeds.process()
        }
      }, 100)
    }
  } else {
    setTimeout(() => {
      if (window.instgrm?.Embeds) {
        window.instgrm.Embeds.process()
      }
    }, 100)
  }
}

onMounted(() => {
  if (iframe.value && iframe.value.includes('instagram-media')) {
    processInstagramEmbeds()
  }
})
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