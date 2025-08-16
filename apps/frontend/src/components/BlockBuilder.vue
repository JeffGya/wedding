<template>
  <div class="space-y-16">
    <!-- Add Block Control -->
    <div class="space-y-8">
      <label class="text-txt font-medium block mb-8">Add Content Block</label>
      <Select
        :options="blockTypeOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Select block type..."
        class="w-full"
        @change="e => addBlock(e.value)"
      />
    </div>

    <!-- Block List -->
    <div class="space-y-16">
      <div 
        v-for="(block, idx) in blocks" 
        :key="idx" 
        class="block-item bg-card-bg rounded-lg p-16 space-y-16"
      >
        <!-- Block Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-16">
            <span class="text-txt font-semibold">{{ idx + 1 }}. {{ getBlockTypeLabel(block.type) }}</span>
            <Tag :value="block.type" severity="info" class="text-xs" />
          </div>
          
          <div class="flex items-center gap-8">
            <ButtonGroup>
              <Button 
                icon="i-solar:round-alt-arrow-up-bold" 
                severity="secondary"
                variant="text"
                :disabled="idx === 0" 
                @click="moveUp(idx)"
                v-tooltip.top="'Move Up'"
                size="large"
              />
              <Button 
                icon="i-solar:round-alt-arrow-down-bold" 
                severity="secondary"
                variant="text"
                :disabled="idx === blocks.length - 1" 
                @click="moveDown(idx)"
                v-tooltip.top="'Move Down'"
                size="large"

              />
            </ButtonGroup>
            <Button 
              icon="i-solar:trash-bin-minimalistic-bold-duotone" 
              severity="danger"
              @click="removeBlock(idx)"
              v-tooltip.top="'Delete Block'"
              size="large"
            />
          </div>
        </div>

        <!-- Block Content -->
        <div class="block-content">
          <FormField
            v-if="block.type === 'richText'"
            :state="props.blockErrors[idx] ? 'error' : null"
            :helper="props.blockErrors[idx]"
          >
            <RichTextEditor
              :modelValue="block.translations[locale].html"
              :context="'page'"
              @update:modelValue="val => updateBlock(idx, 'html', val)"
            />
          </FormField>
          
          <FormField
            v-else-if="block.type === 'image'"
            :state="props.blockErrors[idx] ? 'error' : null"
            :helper="props.blockErrors[idx]"
          >
            <div class="space-y-16">
              <div class="flex items-center gap-16">
                <div v-if="block.translations[locale].src" class="image-preview">
                  <img
                    :src="block.translations[locale].src"
                    :alt="block.translations[locale].alt || 'Preview'"
                    class="preview-image"
                  />
                </div>
                <Button
                  :label="block.translations[locale].src ? 'Change Image' : 'Select Image'"
                  icon="i-solar:gallery-add-bold-duotone"
                  @click="toggleImagePicker(idx, true)"
                  severity="secondary"
                  size="normal"
                />
              </div>
              
              <ImagePicker
                :visible="imagePickerVisible[idx] || false"
                @update:visible="val => toggleImagePicker(idx, val)"
                @select="url => updateBlock(idx, 'src', url)"
              />
              
              <div class="space-y-8">
                <label class="text-txt font-medium block">Alt Text</label>
                <InputText
                  :value="block.translations[locale].alt"
                  placeholder="Enter alt text for accessibility"
                  class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
                  @input="val => updateBlock(idx, 'alt', val)"
                />
              </div>
            </div>
          </FormField>
          
          <FormField
            v-else-if="block.type === 'video' || block.type === 'map'"
            :state="props.blockErrors[idx] ? 'error' : null"
            :helper="props.blockErrors[idx]"
          >
            <div class="space-y-8">
              <EmbedEditor
                :modelValue="block.translations[locale].embed"
                @update:modelValue="val => updateBlock(idx, 'embed', val)"
              />
            </div>
          </FormField>
          
          <FormField
            v-else-if="block.type === 'survey'"
            :state="props.blockErrors[idx] ? 'error' : null"
            :helper="props.blockErrors[idx]"
          >
            <div class="space-y-8">
              <SurveySelector
                :modelValue="block.translations[locale].id"
                @update:modelValue="val => updateBlock(idx, 'id', val)"
                :page-id="pageId"
              />
            </div>
          </FormField>
          
          <div v-else-if="block.type === 'divider'" class="divider-block">
            <Divider class="border-form-border" />
            <p class="text-center text-txt text-sm mt-8">Content Divider</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="blocks.length === 0" class="empty-state text-center py-32">
      <i class="i-solar:add-circle-bold-duotone text-4xl text-gray-400 mb-16"/>
      <p class="text-txt">No content blocks yet. Use the dropdown above to add your first block.</p>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive } from 'vue';
import { defineProps, defineEmits } from 'vue';
import { FormField } from '@primevue/forms';
import Divider from 'primevue/divider';
import Tag from 'primevue/tag';
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

// Helper function to get block type labels
function getBlockTypeLabel(type) {
  const labels = {
    richText: 'Rich Text',
    image: 'Image',
    video: 'Video',
    map: 'Map',
    divider: 'Divider',
    survey: 'Survey'
  };
  return labels[type] || type;
}

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

<style scoped>
.block-item {
  transition: all 0.2s ease;
}

.block-item:hover {
  border-color: var(--form-border-hover);
}

.block-content {
  border-bottom: 1px solid var(--form-border);
  padding-bottom: 16px;
}

.image-preview {
  width: 80px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--form-border);
  background: var(--form-bg);
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.divider-block {
  padding: 16px 0;
}

.empty-state {
  background: var(--form-bg);
  border: 2px dashed var(--form-border);
  border-radius: 8px;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .block-item {
    padding: 12px;
  }
  
  .block-content {
    padding-top: 12px;
  }
  
  .image-preview {
    width: 60px;
    height: 45px;
  }
}

@media (max-width: 480px) {
  .block-item {
    padding: 8px;
  }
  
  .block-content {
    padding-top: 8px;
  }
}
</style>