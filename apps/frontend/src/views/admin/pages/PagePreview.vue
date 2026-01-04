<template>
  <div class="p-m-4">
    <div class="p-mb-4">
      <Button
        icon="pi pi-arrow-left"
        label="Back"
        class="p-button-text"
        @click="router.push({ name: 'admin-pages' })"
      />
    </div>
    <div class="p-flex p-ai-center p-mb-4">
      <h1 class="p-text-2xl p-font-bold p-mr-4">
        Preview: {{ page.slug || 'Loading...' }}
      </h1>
      <Select
        v-model="currentLocale"
        @update:modelValue="onLocaleChange"
        :options="localeOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="Language"
        style="width: 8rem;"
      />
    </div>
    <div v-if="translation">
      <h2 class="p-text-xl p-font-semibold p-mb-2">{{ translation.title }}</h2>
      <BlockRenderer :blocks="blocks" :locale="currentLocale" withSurveys />
    </div>
    <div v-else class="p-text-center p-mt-4">
      Loading translation…
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { fetchPage } from '@/api/pages';
import BlockRenderer from '@/components/BlockRenderer.vue';
import Select from 'primevue/select';
import Button from 'primevue/button';
import { useErrorHandler } from '@/composables/useErrorHandler';

const localeOptions = [
  { label: 'English', value: 'en' },
  { label: 'Lithuanian', value: 'lt' }
];

const typeMap = {
  'rich-text': 'richText',
  image: 'image',
  video: 'video',
  map: 'map',
  divider: 'divider',
  survey: 'survey'
};

const route = useRoute();
const router = useRouter();
const { handleError } = useErrorHandler({ showToast: false }); // Silent errors for preview
const page = ref({});
const translation = ref(null);
const currentLocale = ref(route.query.locale || 'en');
const blocks = ref([]);
const pageData = ref(null);

function rebuild() {
  if (!pageData.value) return;
  translation.value = pageData.value.translations.find(t => t.locale === currentLocale.value) || pageData.value.translations[0];
  blocks.value = (translation.value.content || []).map(apiBlk => {
    const internalType = typeMap[apiBlk.type] || apiBlk.type;
    const base = { type: internalType, id: apiBlk.id };
    const tr = { en: {}, lt: {} };
    switch (apiBlk.type) {
      case 'rich-text':
        tr[currentLocale.value] = { html: apiBlk.html ?? apiBlk.content ?? '' };
        break;
      case 'image':
        tr[currentLocale.value] = { src: apiBlk.src ?? apiBlk.url ?? '', alt: apiBlk.alt ?? '' };
        break;
      case 'video':
      case 'map':
        tr[currentLocale.value] = { embed: apiBlk.embed ?? apiBlk.embedUrl ?? '' };
        break;
      case 'divider':
      case 'survey':
        tr[currentLocale.value] = {};
        break;
    }
    return { ...base, translations: tr };
  });
}

function onLocaleChange(val) {
  // Navigate to the same preview route with updated locale query, then reload
  router.push({
    name: 'admin-page-preview',
    params: { id: route.params.id },
    query: { locale: val }
  }).then(() => {
    // Force a page reload to re-run onMounted logic
    window.location.reload();
  });
}

onMounted(async () => {
  const id = route.params.id;
  try {
    // fetchPage returns the page object directly
    const data = await fetchPage(id, { includeDeleted: true });
    page.value = data;
    pageData.value = data;
  } catch (err) {
    handleError(err, 'Failed to load preview');
    return;
  }
  rebuild();
});
</script>
