<template>
  <div v-if="isEditorReady">
    <editor-content :editor="editor" class="border border-gray-300 rounded p-3 bg-white" />
    <div class="mt-2 flex flex-wrap gap-2">
      <button
        v-for="btn in buttons"
        :key="btn.name"
        @click="btn.action"
        class="px-2 py-1 border rounded text-sm hover:bg-gray-100"
      >
        {{ btn.label }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const props = defineProps({
  modelValue: String,
  language: {
    type: String,
    default: 'EN'
  }
})

const emit = defineEmits(['update:modelValue'])

const isEditorReady = ref(false)
const editor = ref(null)

onMounted(() => {
  editor.value = new Editor({
    content: props.modelValue,
    extensions: [StarterKit],
    onCreate() {
      isEditorReady.value = true
    },
    onUpdate({ editor }) {
      emit('update:modelValue', editor.getHTML())
    }
  })
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})

watch(() => props.modelValue, (newVal) => {
  if (editor.value && newVal !== editor.value.getHTML()) {
    editor.value.commands.setContent(newVal, false)
  }
})

const buttons = [
  {
    name: 'bold',
    label: props.language === 'EN' ? 'Bold' : 'Riebus',
    action: () => editor.value.chain().focus().toggleBold().run()
  },
  {
    name: 'italic',
    label: props.language === 'EN' ? 'Italic' : 'Kursyvas',
    action: () => editor.value.chain().focus().toggleItalic().run()
  },
  {
    name: 'strike',
    label: props.language === 'EN' ? 'Strike' : 'Perbraukimas',
    action: () => editor.value.chain().focus().toggleStrike().run()
  },
  {
    name: 'bullet',
    label: props.language === 'EN' ? 'Bullet List' : 'Sąrašas su ženklais',
    action: () => editor.value.chain().focus().toggleBulletList().run()
  },
  {
    name: 'ordered',
    label: props.language === 'EN' ? 'Ordered List' : 'Numeruotas sąrašas',
    action: () => editor.value.chain().focus().toggleOrderedList().run()
  }
]
</script>

<style scoped>
.editor-content {
  min-height: 150px;
}
</style>
