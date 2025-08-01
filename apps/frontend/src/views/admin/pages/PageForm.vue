<template>
  <div class="p-m-4">
    <ProgressBar v-if="loading" mode="indeterminate" class="p-mb-4" />
    <Alert position="top-right" :life="5000" />
    <Banner
      v-if="bannerMessage"
      :message="bannerMessage"
      type="error"
    />
    <Button icon="pi pi-arrow-left" class="p-button-text p-mb-2" @click="goBack">Back</Button>
    <h1 class="p-text-2xl p-font-bold p-mb-4">
      {{ isEditMode ? 'Edit Page' : 'Create Page' }}
    </h1>

    <!-- Page Settings -->
    <div class="p-grid p-formgrid p-fluid p-mb-4">
      <FormField
        class="p-col-12 p-md-6"
        for="slug"
        label="Slug"
        :helper="slugError"
        :state="slugError ? 'error' : null"
      >
        <label for="slug">Slug</label>
        <InputText id="slug" v-model="page.slug" />
      </FormField>
      <div class="p-field p-col-12 p-md-2">
        <label for="is_published">Published</label>
        <Checkbox binary id="is_published" v-model="page.is_published" />
      </div>
      <FormField
        class="p-col-12 p-md-2"
        for="requires_rsvp"
        label="RSVP Required"
        :helper="page.requires_rsvp ? 'Ensure RSVP flow is configured under Settings before requiring RSVPs.' : ''"
      >
        <label for="requires_rsvp">RSVP Required</label>
        <Checkbox binary id="requires_rsvp" v-model="page.requires_rsvp" />
      </FormField>
      <div class="p-field p-col-12 p-md-2">
        <label for="show_in_nav">Show in Nav</label>
        <Checkbox binary id="show_in_nav" v-model="page.show_in_nav" />
      </div>
      <FormField
        class="p-col-12 p-md-2"
        for="nav_order"
        label="Nav Order"
        :state="navError ? 'error' : null"
        :helper="navError"
      >
        <InputNumber id="nav_order" v-model="page.nav_order" :min="1" :disabled="!page.show_in_nav" />
      </FormField>
    </div>

    <!-- Locale Selector & Title -->
    <div class="p-grid p-formgrid p-fluid p-mb-4">
      <div class="p-field p-col-12 p-md-3">
        <label for="locale">Language</label>
        <Select
          id="locale"
          v-model="currentLocale"
          :options="localeOptions"
          optionLabel="label"
          optionValue="value"
        />
      </div>
      <FormField
        class="p-col-12 p-md-9"
        for="title"
        label="Title"
        :helper="titleError"
        :state="titleError ? 'error' : null"
      >
        <label for="title">Title ({{ currentLocale }})</label>
        <InputText id="title" v-model="pageTranslations[currentLocale].title" />
      </FormField>
    </div>

    <!-- Block Builder -->
    <div v-if="loading">
      <Skeleton width="100%" height="200px" />
    </div>
    <BlockBuilder
      v-else
      :blocks="blocks"
      :locale="currentLocale"
      :page-id="pageId"
      @update:blocks="blocks = $event"
    />
    <small v-if="blocksError" class="p-error">{{ blocksError }}</small>
    <small v-if="contentErrors" class="p-error">{{ contentErrors }}</small>

    <!-- Preview & Validate -->
    <div class="p-mb-4">
      <Button label="Preview" severity="info" class="p-mr-2" @click="previewPage" />
      <Button label="Validate" severity="warning" @click="validateContent" />
    </div>

    <!-- Preview Modal -->
    <Dialog
      header="Page Preview"
      v-model:visible="previewVisible"
      modal
      :style="{ width: '80vw' }"
      focusOnShow
    >
      <BlockRenderer :blocks="blocks" :locale="currentLocale" withSurveys />
    </Dialog>

    <!-- Actions -->
    <div>
      <Button
        label="Save"
        severity="primary"
        @click="savePage"
        :loading="saving"
        :disabled="hasErrors"
      />
      <Button label="Cancel" class="p-button-text" @click="cancel" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BlockBuilder from '@/components/BlockBuilder.vue';

import {
  fetchPage,
  createPage,
  updatePage
} from '@/api/pages';
import Banner from '@/components/ui/Banner.vue';
import Dialog from 'primevue/dialog';
import BlockRenderer from '@/components/BlockRenderer.vue';
import pageFormSchema from '@/validation/pageForm.schema.js';

defineExpose({ components: { Dialog, BlockRenderer } });

const route = useRoute();
const router = useRouter();
const pageId = route.params.id ? Number(route.params.id) : null;
const isEditMode = computed(() => pageId !== null);

const page = ref({
  slug: '',
  is_published: false,
  requires_rsvp: false,
  show_in_nav: false,
  nav_order: 1
});
const currentLocale = ref('en');

const bannerMessage = ref('');
const localeOptions = [
  { label: 'English', value: 'en' },
  { label: 'Lithuanian', value: 'lt' }
];
const pageTranslations = ref({
  en: { title: '' },
  lt: { title: '' }
});
const blocks = ref([]);
const saving = ref(false);
const initialPage = ref(null);
const initialTranslations = ref(null);
const initialBlocks = ref(null);
const loading = ref(false);
const previewVisible = ref(false);

// Slug validation
const slugError = ref('');
watch(
  () => page.value.slug,
  (val) => {
    if (!val.trim()) {
      slugError.value = 'Slug is required.';
    } else if (!/^[a-z0-9\-]+$/.test(val)) {
      slugError.value = 'Slug must only contain lowercase letters, numbers, and hyphens.';
    } else {
      slugError.value = '';
    }
  },
  { immediate: true }
);

// Title validation
const titleError = computed(() => {
  const title = pageTranslations.value[currentLocale.value]?.title || '';
  return !title.trim() ? 'Title required for this language.' : '';
});

// Overall form validity
const navError = computed(() => {
  return page.value.show_in_nav && (!page.value.nav_order || page.value.nav_order < 1)
    ? 'Nav order must be at least 1 when showing in navigation.'
    : '';
});

const blocksError = computed(() => {
  return blocks.value.length === 0
    ? 'At least one block is required.'
    : '';
});

// Validate that rich-text blocks have content in both locales
const contentErrors = computed(() => {
  // Ensure richText blocks have content in both locales
  for (const [idx, b] of blocks.value.entries()) {
    if (b.type === 'richText') {
      const enHtml = b.translations.en.html?.trim();
      const ltHtml = b.translations.lt.html?.trim();
      if (!enHtml || !ltHtml) {
        return `Block ${idx + 1}: Rich text content is required in both English and Lithuanian.`;
      }
    }
  }
  return '';
});

const hasErrors = computed(() => !!slugError.value || !!titleError.value || !!blocksError.value || !!contentErrors.value);

onMounted(async () => {
  loading.value = true;
  if (isEditMode.value) {
    try {
      const pageData = await fetchPage(pageId);
      page.value = {
        slug: pageData.slug,
        is_published: Boolean(pageData.is_published),
        requires_rsvp: Boolean(pageData.requires_rsvp),
        show_in_nav: Boolean(pageData.show_in_nav),
        nav_order: pageData.nav_order
      };
      pageData.translations.forEach(t => {
        pageTranslations.value[t.locale] = { title: t.title };
      });
      // Hydrate blocks for both locales (manual mapping, rich-text html fallback)
      const enTrans = pageData.translations.find(t => t.locale === 'en') || {};
      const ltTrans = pageData.translations.find(t => t.locale === 'lt') || {};
      const enBlocks = enTrans.content || [];
      const ltBlocks = ltTrans.content || [];
      blocks.value = enBlocks.map((enBlk, idx) => {
        const ltBlk = ltBlocks[idx] || {};
        const typeMap = { 'rich-text': 'richText', image: 'image', video: 'video', map: 'map', divider: 'divider', survey: 'survey' };
        const type = typeMap[enBlk.type] || enBlk.type;
        const translations = { en: {}, lt: {} };
        switch (enBlk.type) {
          case 'rich-text':
            translations.en.html = enBlk.html ?? enBlk.content ?? '';
            translations.lt.html = ltBlk.html ?? ltBlk.content ?? '';
            break;
          case 'image':
            translations.en.src = enBlk.src ?? enBlk.url ?? '';
            translations.en.alt = enBlk.alt ?? '';
            translations.lt.src = ltBlk.src ?? ltBlk.url ?? '';
            translations.lt.alt = ltBlk.alt ?? '';
            break;
          case 'video':
          case 'map':
            translations.en.embed = enBlk.embed ?? enBlk.embedUrl ?? '';
            translations.lt.embed = ltBlk.embed ?? ltBlk.embedUrl ?? '';
            break;
          case 'divider':
            break;
          case 'survey':
            translations.en.id = enBlk.id;
            translations.lt.id = ltBlk.id;
            break;
        }
        return { id: enBlk.id, type, translations };
      });
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        router.push({ name: 'NotFound' });
      } else if (status === 403) {
        toast.add({ severity: 'error', summary: 'Unauthorized', detail: 'You are not authorized to edit this page.' });
        router.push({ name: 'Login' });
      } else {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load page. Please try again.' });
      }
    }
  } else {
    pageTranslations.value = { en: { title: '' }, lt: { title: '' } };
    blocks.value = [];
  }
  loading.value = false;
});
// Snapshot initial state for change detection
initialPage.value = JSON.parse(JSON.stringify(page.value));
initialTranslations.value = JSON.parse(JSON.stringify(pageTranslations.value));
initialBlocks.value = JSON.parse(JSON.stringify(blocks.value));

const previewPage = () => {
  previewVisible.value = true;
};

// Helper: map internal block to API payload
function mapInternalToApi(block, locale) {
  const effectiveType = block.type === 'richText' ? 'rich-text' : block.type;
  const base = { type: effectiveType };
  switch (block.type) {
    case 'richText':
      return { ...base, html: block.translations[locale].html };
    case 'image':
      return {
        ...base,
        src: block.translations[locale].src,
        alt: block.translations[locale].alt
      };
    case 'map':
    case 'video':
      return { ...base, embed: block.translations[locale].embed };
    case 'divider':
      return base;
    case 'survey':
      return { ...base, id: block.translations[locale].id };
    default:
      return base;
  }
}

const validateContent = async () => {
  try {
    // Compose payload for validation
    const payload = {
      slug: page.value.slug,
      translations: pageTranslations.value,
      blocks: blocks.value
    };
    await pageFormSchema.validateAsync(payload, { abortEarly: false });
    // On success, clear banner
    bannerMessage.value = '';
  } catch (err) {
    if (err.isJoi && Array.isArray(err.details)) {
      // Filter to errors related to current locale (or global like slug)
      const locale = currentLocale.value;
      const filtered = err.details.filter(d => d.path.includes(locale) || d.path[0] === 'slug');
      const uniqueMsgs = [...new Set(filtered.map(d => d.message))];
      bannerMessage.value = uniqueMsgs.join('; ');
      // Scroll to first relevant field
      const firstDetail = filtered[0] || err.details[0];
      const firstPath = firstDetail.path.join('-');
      const el = document.getElementById(firstPath);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      bannerMessage.value = 'Validation failed.';
    }
  }
};

const savePage = async () => {
  saving.value = true;
  try {
    console.log('Saving page...', page.value, blocks.value, pageTranslations.value);
    // Build page payload including translations
    const fullPayload = {
      slug: page.value.slug,
      is_published: page.value.is_published,
      requires_rsvp: page.value.requires_rsvp,
      show_in_nav: page.value.show_in_nav,
      nav_order: page.value.nav_order,
      translations: localeOptions.map(({ value: locale }) => ({
        locale,
        title: pageTranslations.value[locale].title,
        content: blocks.value.map(b => mapInternalToApi(b, locale))
      }))
    };
    let resultPage;
    if (isEditMode.value) {
      resultPage = await updatePage(pageId, fullPayload);
    } else {
      resultPage = await createPage(fullPayload);
    }
    const newPage = { id: resultPage.id };
    bannerMessage.value = 'Page saved successfully.';
    router.push({ name: 'admin-pages' });
  } catch (err) {
    console.error('Failed to save page', err, err.response && err.response.data);
    const serverMsg = err.response?.data?.message || err.response?.data?.error?.message;
    bannerMessage.value = serverMsg
      ? `Failed to save page: ${serverMsg}`
      : `Failed to save page: ${err.message || 'Unknown error'}`;
  } finally {
    saving.value = false;
  }
};

const cancel = () => {
  router.push({ name: 'admin-pages' });
};

function goBack() {
  const pageChanged = JSON.stringify(page.value) !== JSON.stringify(initialPage.value);
  const transChanged = JSON.stringify(pageTranslations.value) !== JSON.stringify(initialTranslations.value);
  const blocksChanged = JSON.stringify(blocks.value) !== JSON.stringify(initialBlocks.value);
  if (pageChanged || transChanged || blocksChanged) {
    if (!window.confirm('You have unsaved changes. Are you sure you want to leave and lose these changes?')) {
      return;
    }
  }
  router.push({ name: 'admin-pages' });
}

const toast = {
  add: (...args) => {
    // If you have a global event bus or Alert wrapper, trigger it here.
    // This is just a placeholder to avoid runtime errors if used.
  }
};
</script>