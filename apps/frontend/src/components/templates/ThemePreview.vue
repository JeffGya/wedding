<template>
  <div class="theme-preview">
    <div class="theme-selector mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Choose Theme
      </label>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          v-for="theme in themes" 
          :key="theme.id"
          class="theme-card cursor-pointer border-2 rounded-lg p-4 transition-all"
          :class="[
            selectedTheme === theme.id 
              ? 'border-acc-base bg-acc-base bg-opacity-10' 
              : 'border-form-border hover:border-acc-base'
          ]"
          @click="selectTheme(theme.id)"
        >
          <div class="theme-preview-content mb-3" :style="getThemeStyles(theme.id)">
            <div class="preview-header text-center mb-2">
              <h4 class="text-sm font-semibold">Sample</h4>
            </div>
            <div class="preview-body text-xs">
              <p>Dear Guest,</p>
              <p>Sample content...</p>
            </div>
          </div>
          <div class="theme-info">
            <h4 class="font-medium text-sm">{{ theme.name }}</h4>
            <p class="text-xs text-gray-600">{{ theme.description }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="theme-preview-full" v-if="selectedTheme">
      <h3 class="text-lg font-semibold mb-4">Theme Preview</h3>
      <div class="preview-container border rounded-lg overflow-hidden">
        <div class="preview-email" :style="getThemeStyles(selectedTheme)">
          <div class="email-header text-center py-6">
            <h1 class="text-3xl font-bold mb-2">Brigita & Jeffrey</h1>
            <p class="text-lg italic">June 15, 2024</p>
          </div>
          
          <div class="email-content px-6 pb-6">
            <p class="mb-4">Dear {{guestName}},</p>
            <p class="mb-4">We're excited to invite you to our wedding celebration!</p>
            <p class="mb-4">Please RSVP by {{rsvpDeadline}}:</p>
            
            <div class="text-center my-6">
              <button class="cta-button">RSVP Now</button>
            </div>
            
            <p class="mb-4">We can't wait to celebrate with you!</p>
          </div>
          
          <div class="email-footer text-center py-4 border-t">
            <p class="text-sm">Best regards,<br>Brigita & Jeffrey</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { EMAIL_THEMES, getThemeData } from '@/utils/htmlTemplates'

const props = defineProps({
  modelValue: {
    type: String,
    default: 'elegant'
  }
})

const emit = defineEmits(['update:modelValue'])

const selectedTheme = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const themes = computed(() => {
  return Object.entries(EMAIL_THEMES).map(([id, theme]) => ({
    id,
    name: theme.name,
    description: theme.description
  }))
})

function selectTheme(themeId) {
  selectedTheme.value = themeId
}

function getThemeStyles(themeId) {
  const theme = getThemeData(themeId)
  return {
    fontFamily: theme.fonts.body,
    color: theme.colors.text,
    backgroundColor: theme.colors.cardBg,
    border: `1px solid ${theme.colors.secondary}`,
    borderRadius: '12px',
    padding: '16px'
  }
}
</script>

<style scoped>
.theme-preview-content {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.preview-email {
  max-width: 500px;
  margin: 0 auto;
  background: var(--card-bg);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.email-header {
  background: var(--int-base);
  color: var(--int-text);
}

.email-content {
  padding: 24px;
  font-family: inherit;
}

.cta-button {
  background: var(--acc-base);
  color: var(--int-base);
  padding: 12px 24px;
  border-radius: 24px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cta-button:hover {
  background: var(--acc-hover);
  transform: translateY(-1px);
}

.email-footer {
  border-top: 1px solid var(--form-border);
  color: var(--acc2-base);
}
</style> 