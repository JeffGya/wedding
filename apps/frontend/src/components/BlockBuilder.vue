<template>
  <div class="p-mb-4">
    <!-- Add Block Control -->
    <div class="p-mb-3">
      <Select
        :options="blockTypeOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Add block..."
        @change="e => addBlock(e.value)"
      />
    </div>

    <!-- Block List -->
    <div v-for="(block, idx) in blocks" :key="idx" class="p-mb-4 p-p-3 p-shadow-2">
      <div class="p-d-flex p-jc-between p-ai-center p-mb-2">
        <span class="p-text-bold">{{ idx + 1 }}. {{ block.type }}</span>
        <div>
          <Button icon="pi pi-arrow-up" class="p-button-text p-mr-2"
            :disabled="idx === 0" @click="moveUp(idx)" />
          <Button icon="pi pi-arrow-down" class="p-button-text p-mr-2"
            :disabled="idx === blocks.length - 1" @click="moveDown(idx)" />
          <Button icon="pi pi-trash" class="p-button-text p-button-danger"
            @click="removeBlock(idx)" />
        </div>
      </div>

      <FormField
        v-if="block.type === 'richText'"
        :state="props.blockErrors[idx] ? 'error' : null"
        :helper="props.blockErrors[idx]"
      >
        <RichTextEditor
          :modelValue="block.translations[locale].html"
          @update:modelValue="val => updateBlock(idx, 'html', val)"
        />
      </FormField>
      <FormField
        v-else-if="block.type === 'image'"
        :state="props.blockErrors[idx] ? 'error' : null"
        :helper="props.blockErrors[idx]"
      >
        <div class="p-d-flex p-ai-center p-mb-2">
          <img
            v-if="block.translations[locale].src"
            :src="block.translations[locale].src"
            alt=""
            style="height: 50px; margin-right: 1rem;"
          />
          <Button
            label="Select Image"
            icon="pi pi-image"
            class="p-button-text"
            @click="toggleImagePicker(idx, true)"
          />
        </div>
        <ImagePicker
          :visible="imagePickerVisible[idx] || false"
          @update:visible="val => toggleImagePicker(idx, val)"
          @select="url => updateBlock(idx, 'src', url)"
        />
        <InputText
          class="p-mt-2"
          :value="block.translations[locale].alt"
          placeholder="Alt text"
          @input="val => updateBlock(idx, 'alt', val)"
        />
      </FormField>
      <FormField
        v-else-if="block.type === 'video' || block.type === 'map'"
        :state="props.blockErrors[idx] ? 'error' : null"
        :helper="props.blockErrors[idx]"
      >
        <EmbedEditor
          :modelValue="block.translations[locale].embed"
          @update:modelValue="val => updateBlock(idx, 'embed', val)"
        />
      </FormField>
      <FormField
        v-else-if="block.type === 'survey'"
        :state="props.blockErrors[idx] ? 'error' : null"
        :helper="props.blockErrors[idx]"
      >
        <SurveySelector
          :modelValue="block.translations[locale].id"
          @update:modelValue="val => updateBlock(idx, 'id', val)"
          :page-id="pageId"
        />
      </FormField>
      <div v-else-if="block.type === 'divider'">
        <Divider />
      </div>

    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue';
import { defineProps, defineEmits } from 'vue';
import { FormField } from '@primevue/forms';
import Divider from 'primevue/divider';
import RichTextEditor from '@/components/forms/RichTextEditor.vue';
import ImagePicker from '@/components/ui/ImagePicker.vue';
import EmbedEditor from '@/components/EmbedEditor.vue';
import SurveySelector from '@/components/SurveySelector.vue';

const props = defineProps({
  blocks: {
    type: Array,
    required: true
  },
  pageId: {
    type: Number,
    default: null
  },
  locale: { type: String, required: true },
  blockErrors: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['update:blocks']);

const imagePickerVisible = reactive({});
function toggleImagePicker(idx, val) {
  imagePickerVisible[idx] = val;
}

// Define available block types
const blockTypeOptions = [
  { label: 'Rich Text', value: 'richText' },
  { label: 'Image', value: 'image' },
  { label: 'Video', value: 'video' },
  { label: 'Map', value: 'map' },
  { label: 'Divider', value: 'divider' },
  { label: 'Survey', value: 'survey' }
];

// Helpers to emit updated blocks array
function updateBlocks(newBlocks) {
  emit('update:blocks', newBlocks);
}

// Add a new blank block based on type
function addBlock(type) {
  const defaultTrans = {
    richText: { en: { html: '' }, lt: { html: '' } },
    image:    { en: { src: '', alt: '' }, lt: { src: '', alt: '' } },
    video:    { en: { embed: '' }, lt: { embed: '' } },
    map:      { en: { embed: '' }, lt: { embed: '' } },
    divider:  { en: {}, lt: {} },
    survey:   { en: { id: null }, lt: { id: null } }
  };
  const newBlock = {
    type,
    translations: defaultTrans[type] || { en: {}, lt: {} }
  };
  updateBlocks([...props.blocks, newBlock]);
}

// Remove block at index
function removeBlock(idx) {
  if (!window.confirm('Are you sure you want to delete this block?')) return;
  const b = [...props.blocks];
  b.splice(idx, 1);
  updateBlocks(b);
}

// Move block up/down
function moveUp(idx) {
  if (idx === 0) return;
  const b = [...props.blocks];
  const temp = b[idx - 1];
  b[idx - 1] = b[idx];
  b[idx] = temp;
  updateBlocks(b);
}
function moveDown(idx) {
  if (idx === props.blocks.length - 1) return;
  const b = [...props.blocks];
  const temp = b[idx + 1];
  b[idx + 1] = b[idx];
  b[idx] = temp;
  updateBlocks(b);
}

// Handle per-block update
function updateBlock(idx, field, value) {
  const b = [...props.blocks];
  const blk = b[idx];
  switch (blk.type) {
    case 'richText':
      blk.translations[props.locale].html = value;
      break;
    case 'image':
      if (value && typeof value === 'object' && 'src' in value && 'alt' in value) {
        blk.translations[props.locale].src = value.src;
        blk.translations[props.locale].alt = value.alt;
      } else if (field === 'src') {
        blk.translations[props.locale].src = value;
      } else if (field === 'alt') {
        blk.translations[props.locale].alt = value;
      }
      break;
    case 'video':
    case 'map':
      blk.translations[props.locale].embed = value;
      break;
    case 'survey':
      blk.translations[props.locale].id = value;
      break;
    // no fields for 'divider'
  }
  updateBlocks(b);
}
</script>