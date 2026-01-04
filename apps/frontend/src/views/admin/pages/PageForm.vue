<template>
  <AdminPageWrapper 
    :title="isEditMode ? 'Edit Page' : 'Create Page'"
    description="Create and edit wedding website pages with rich content blocks"
  >
    <template #headerActions>
      <Button 
        icon="i-solar:arrow-left-bold" 
        severity="secondary" 
        text
        @click="goBack"
        v-tooltip.top="'Back to Pages'"
      />
    </template>

    <ProgressBar v-if="loading" mode="indeterminate" class="mb-4" />
    <Alert position="top-right" :life="5000" />
    
    <Banner
      v-if="bannerMessage"
      :message="bannerMessage"
      type="error"
      class="mb-4"
    />

    <!-- Page Settings -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="i-solar:settings-bold text-acc-base"></i>
          <span>Page Settings</span>
        </div>
      </template>
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
          <FormField
            class="md:col-span-6"
            for="slug"
            label="Slug"
            :helper="slugError"
            :state="slugError ? 'error' : null"
          >
            <label for="slug">Slug</label>
            <InputText id="slug" v-model="page.slug" />
          </FormField>
          
          <div class="md:col-span-2">
            <label for="is_published" class="block text-sm font-medium text-text mb-2">Published</label>
            <Checkbox binary id="is_published" v-model="page.is_published" />
          </div>
          
          <FormField
            class="md:col-span-2"
            for="requires_rsvp"
            label="RSVP Required"
            :helper="page.requires_rsvp ? 'Ensure RSVP flow is configured under Settings before requiring RSVPs.' : ''"
          >
            <label for="requires_rsvp">RSVP Required</label>
            <Checkbox binary id="requires_rsvp" v-model="page.requires_rsvp" />
          </FormField>
          
          <div class="md:col-span-2">
            <label for="show_in_nav" class="block text-sm font-medium text-text mb-2">Show in Nav</label>
            <Checkbox binary id="show_in_nav" v-model="page.show_in_nav" />
          </div>
          
          <FormField
            class="md:col-span-2"
            for="nav_order"
            label="Nav Order"
            :state="navError ? 'error' : null"
            :helper="navError"
          >
            <InputNumber id="nav_order" v-model="page.nav_order" :min="1" :disabled="!page.show_in_nav" />
          </FormField>

          <!-- Header Image -->
          <FormField
            class="md:col-span-12"
            for="header_image_url"
            label="Header Background Image"
            helper="Choose an image to display behind the page title. Leave empty to use default color."
          >
            <div class="flex items-center gap-4">
              <div v-if="page.header_image_url" class="flex items-center gap-2">
                <img 
                  :src="page.header_image_url" 
                  :alt="'Header image preview'"
                  class="w-16 h-16 object-cover rounded border border-form-border"
                />
                <span class="text-sm text-text">{{ page.header_image_url.split('/').pop() }}</span>
              </div>
              <div v-else class="text-sm text-form-placeholder-text">
                No image selected - will use default color background
              </div>
              <div class="flex gap-2">
                <Button 
                  label="Select Image" 
                  icon="i-solar:gallery-bold"
                  severity="secondary" 
                  @click="showImagePicker = true"
                />
                <Button 
                  v-if="page.header_image_url"
                  label="Remove" 
                  icon="i-solar:trash-bin-minimalistic-bold"
                  severity="danger" 
                  text
                  @click="page.header_image_url = null"
                />
              </div>
            </div>
          </FormField>
        </div>
      </template>
    </Card>

    <!-- Locale Selector & Title -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="i-solar:globe-bold text-acc-base"></i>
          <span>Content</span>
        </div>
      </template>
      <template #content>
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div class="md:col-span-3">
            <label for="locale" class="block text-sm font-medium text-text mb-2">Language</label>
            <Select
              id="locale"
              v-model="currentLocale"
              :options="localeOptions"
              optionLabel="label"
              optionValue="value"
            />
          </div>
          
          <FormField
            class="md:col-span-9"
            for="title"
            label="Title"
            :helper="titleError"
            :state="titleError ? 'error' : null"
          >
            <label for="title">Title ({{ currentLocale }})</label>
            <InputText id="title" v-model="pageTranslations[currentLocale].title" />
          </FormField>
        </div>
      </template>
    </Card>

    <!-- Block Builder -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="i-solar:layers-minimalistic-bold text-acc-base"></i>
          <span>Content Blocks</span>
        </div>
      </template>
      <template #content>
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
        <small v-if="blocksError" class="text-red-500">{{ blocksError }}</small>
        <small v-if="contentErrors" class="text-red-500">{{ contentErrors }}</small>
      </template>
    </Card>

    <!-- Preview & Validate -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="i-solar:eye-bold text-acc-base"></i>
          <span>Preview & Validation</span>
        </div>
      </template>
      <template #content>
        <div class="flex gap-2">
          <Button 
            label="Preview" 
            icon="i-solar:eye-bold" 
            severity="info" 
            @click="previewPage" 
          />
          <Button 
            label="Validate" 
            icon="i-solar:check-circle-bold" 
            severity="warning" 
            @click="validateContent" 
          />
        </div>
      </template>
    </Card>

    <!-- Actions -->
    <div class="flex gap-2">
      <Button
        label="Save"
        icon="i-solar:disk-bold"
        severity="primary"
        @click="savePage"
        :loading="saving"
        :disabled="hasErrors"
      />
      <Button 
        label="Cancel" 
        icon="i-solar:close-circle-bold"
        severity="secondary" 
        text
        @click="cancel" 
      />
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

    <!-- Image Picker Modal -->
    <ImagePicker 
      :visible="showImagePicker"
      @update:visible="showImagePicker = $event"
      @select="onImageSelected"
    />
  </AdminPageWrapper>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BlockBuilder from '@/components/BlockBuilder.vue';
import AdminPageWrapper from '@/components/AdminPageWrapper.vue';
import Dialog from 'primevue/dialog';
import BlockRenderer from '@/components/BlockRenderer.vue';
import ProgressBar from 'primevue/progressbar';
import Skeleton from 'primevue/skeleton';
import Banner from '@/components/ui/Banner.vue';
import ImagePicker from '@/components/ui/ImagePicker.vue';

import {
  fetchPage,
  createPage,
  updatePage
} from '@/api/pages';
import pageFormSchema from '@/validation/pageForm.schema.js';
import { useLoading } from '@/composables/useLoading';
import { useErrorHandler } from '@/composables/useErrorHandler';

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
  nav_order: 1,
  header_image_url: null
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
const { loading } = useLoading();
const { handleError } = useErrorHandler({ showToast: true });
const previewVisible = ref(false);
const showImagePicker = ref(false);

const onImageSelected = (imageUrl) => {
  page.value.header_image_url = imageUrl;
  showImagePicker.value = false;
};

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
        nav_order: pageData.nav_order,
        header_image_url: pageData.header_image_url
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
        handleError(err, 'You are not authorized to edit this page.');
        router.push({ name: 'Login' });
      } else {
        handleError(err, 'Failed to load page. Please try again.');
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
      header_image_url: page.value.header_image_url,
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

</script>

<style scoped>
/* Enhanced styling for better visual hierarchy */
.card {
  margin-bottom: 1.5rem;
}

/* Icon styling for card headers */
.card .p-card-title i {
  font-size: 1.2rem;
  width: 1.2rem;
  height: 1.2rem;
}

/* Form field spacing */
.form-field {
  margin-bottom: 1rem;
}

/* Button group styling */
.button-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* Enhanced grid responsiveness */
@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }
}

/* Card content padding */
.p-card-content {
  padding: 1.5rem;
}

/* Form validation styling */
.error-text {
  color: var(--p-danger-color);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

/* Loading state styling */
.loading-overlay {
  position: relative;
  opacity: 0.6;
  pointer-events: none;
}

/* Preview modal styling */
.preview-modal .p-dialog-content {
  max-height: 80vh;
  overflow-y: auto;
}
</style>