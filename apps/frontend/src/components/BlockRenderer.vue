<template>
  <div>
    <div v-for="(block, idx) in blocks" :key="idx" class="block-renderer__block h-auto">
      <div
        v-if="block.type === 'richText' || block.type === 'rich-text'"
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
import { defineProps } from 'vue';
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
</style>