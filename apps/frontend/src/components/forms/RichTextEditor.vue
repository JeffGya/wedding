<template>
  <Editor
    v-model="content"
    :modules="modules"
    :formats="formats"
    editorStyle="height: 150px"
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
      </span>
      <span class="ql-formats">
        <button type="button" @click="toggleHtml">HTML</button>
      </span>
    </template>
  </Editor>
  <div v-if="showHtml" class="mt-2">
    <textarea v-model="content" rows="10" class="w-full border rounded p-2"></textarea>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import Editor from 'primevue/editor';
import Quill from 'quill';
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

const formats = [ 'font', 'size', 'header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link' ];

const editorRef = ref(null);
const showHtml = ref(false);
const toggleHtml = () => {
  showHtml.value = !showHtml.value;
};
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
