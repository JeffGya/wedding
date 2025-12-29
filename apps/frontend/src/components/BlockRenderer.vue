<template>
  <div>
    <div v-for="(block, idx) in blocks" :key="idx" class="block-renderer__block h-auto">
      <div
        v-if="block.type === 'richText' || block.type === 'rich-text'"
        class="ql-editor ql-snow"
        v-html="getContent(block).html"
      ></div>
      <div v-else-if="block.type === 'image'">
        <img :src="getContent(block).src" :alt="getContent(block).alt || ''" class="block-renderer__image" />
      </div>
      <div v-else-if="block.type === 'video' || block.type === 'map'" v-html="getContent(block).embed"></div>
      <hr v-else-if="block.type === 'divider'"/>
      <div v-else-if="block.type === 'survey' && withSurveys">
        <SurveyForm :survey="block" />
      </div>
      <Banner
        v-else-if="block.type === 'error'"
        class="m-16"
        :message="block.message"
        type="error"
      />
      <Banner
        v-else
        class="my-4"
        :message="`Unknown block type: ${block.type}`"
        type="warn"
      />
    </div>
  </div>
</template>

<script setup>
import { defineProps, onMounted, watch, nextTick } from 'vue';
import SurveyForm from '@/components/SurveyForm.vue';
import Banner from '@/components/ui/Banner.vue';

const props = defineProps({
  blocks: {
    type: Array,
    required: true
  },
  locale: {
    type: String,
    default: 'en'
  },
  withSurveys: {
    type: Boolean,
    default: false
  }
});

const { blocks, locale, withSurveys } = props;

// Load and initialize Instagram embeds
async function processInstagramEmbeds() {
  await nextTick();
  
  if (!window.instgrm) {
    const script = document.createElement('script');
    script.src = 'https://www.instagram.com/embed.js';
    script.async = true;
    document.head.appendChild(script);
    
    script.onload = () => {
      setTimeout(() => {
        if (window.instgrm?.Embeds) {
          window.instgrm.Embeds.process();
        }
      }, 100);
    };
  } else {
    setTimeout(() => {
      if (window.instgrm?.Embeds) {
        window.instgrm.Embeds.process();
      }
    }, 100);
  }
}

// Watch for block changes
watch(() => blocks, () => {
  processInstagramEmbeds();
}, { deep: true, immediate: false });

onMounted(() => {
  processInstagramEmbeds();
});

/**
 * Retrieve localized content for admin blocks or top-level for public blocks
 */
function getContent(block) {
  if (block.translations && typeof block.translations === 'object') {
    return block.translations[locale] || {};
  }
  return block;
}
</script>

<style scoped>
.block-renderer__image {
  max-width: 100%;
  height: auto;
}

/* Make all images in rich text content responsive */
:deep(.ql-editor img) {
  max-width: 100% !important;
  height: auto !important;
}
</style>

:deep(.ql-editor img) {
  max-width: 100% !important;
  height: auto !important;
}
</style>
