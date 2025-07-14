<template>
  <Editor
    v-model="content"
    :modules="modules"
    :formats="formats"
    editorStyle="height: 400px"
    ref="editorRef"
  >
    <template #toolbar>
      <select class="ql-header">
        <option selected></option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
      </select>
      <select class="ql-size">
        <option value="small">Small</option>
        <option selected>Normal</option>
        <option value="large">Large</option>
        <option value="huge">Huge</option>
      </select>
      <select class="ql-font">
        <option selected></option>
        <option value="serif">Serif</option>
        <option value="sans">Sans Serif</option>
        <option value="cursive">Cursive</option>
        <option value="monospace">Monospace</option>
      </select>
      <span class="ql-formats">
        <button class="ql-bold"></button>
        <button class="ql-italic"></button>
        <button class="ql-underline"></button>
      </span>
      <span class="ql-formats">
        <button class="ql-list" value="ordered"></button>
        <button class="ql-list" value="bullet"></button>
      </span>
      <span class="ql-formats">
        <button class="ql-link"></button>
        <button
          type="button"
          class="ql-insertImage"
          @mousedown.prevent
          @click="openImagePicker"
        >
          <i class="pi pi-image"></i>
        </button>
      </span>
      <span class="ql-formats">
        <button type="button" @mousedown.prevent @click="toggleHtml">HTML</button>
      </span>
    </template>
  </Editor>
  <ImagePicker
    :visible="pickerVisible"
    @update:visible="pickerVisible = $event"
    @select="insertImage"
  />
  <div v-if="showHtml" class="mt-2">
    <textarea v-model="content" rows="10" class="w-full border rounded p-2"></textarea>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import Editor from 'primevue/editor';
import Quill from 'quill';
import ImagePicker from '@/components/ui/ImagePicker.vue';
const Font = Quill.import('formats/font');
Font.whitelist = ['serif','sans','cursive','monospace'];
Quill.register(Font, true);

const props = defineProps({
  modelValue: String
});

const emit = defineEmits(['update:modelValue']);

const content = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
});

const modules = {
  toolbar: {
    container: '.p-editor-toolbar'
  }
};

const formats = [ 'font', 'size', 'header', 'bold', 'italic', 'underline', 'list', 'link', 'image' ];

const editorRef = ref(null);
const showHtml = ref(false);
const toggleHtml = () => {
  showHtml.value = !showHtml.value;
};

const pickerVisible = ref(false);

function openImagePicker() {
  pickerVisible.value = true;
}

function insertImage(url) {
  const quill = editorRef.value.quill;
  const range = quill.getSelection(true);
  quill.focus();
  // Prompt for image size
  const choice = window.prompt(
    'Select image size: small, medium, large',
    'medium'
  );
  const sizeMap = { small: 150, medium: 300, large: 600 };
  const width = sizeMap[choice] || sizeMap.medium;
  // Insert image embed
  quill.insertEmbed(range.index, 'image', url, 'user');
  // Apply inline styles to the inserted image
  const [leaf] = quill.getLeaf(range.index);
  if (leaf?.domNode instanceof HTMLImageElement) {
    leaf.domNode.style.width = `${width}px`;
    leaf.domNode.style.maxWidth = '100%';
    leaf.domNode.style.height = 'auto';
  }
  pickerVisible.value = false;
}
</script>

<style scoped>
.ql-font-serif { font-family: 'Lora', serif; }
.ql-font-sans { font-family: 'Open Sans', sans-serif; }
.ql-font-cursive { font-family: 'Great Vibes', cursive; }
.ql-font-monospace { font-family: monospace; }
.ql-color-mode.ql-picker .ql-picker-label::before {
  content: attr(data-label);
  margin-inline-end: 0.5rem;
}
</style>
