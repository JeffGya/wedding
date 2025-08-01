<template>
    <div class="embed-editor">
      <InputText
        v-model="rawInput"
        placeholder="Paste iframe code or URL"
        class="p-mb-2"
      />
      <Button label="Normalize" @click="applyEmbed" />
      <div v-if="iframe" class="preview p-mt-2" v-html="iframe"></div>
    </div>
  </template>
  
  <script setup>
  import { ref, watch } from 'vue'
  import InputText from 'primevue/inputtext'
  import Button from 'primevue/button'
  
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
    // If it’s just a URL, wrap into a basic iframe
    if (!code.startsWith('<iframe')) {
      code = `<iframe src="${code}" width="100%" height="360" frameborder="0" allowfullscreen></iframe>`
    }
    iframe.value = code
    emit('update:modelValue', code)
  }
  </script>