<template>
  <main class="mx-16 md:mx-40 lg:mx-80 mt-8">
    <!-- Not Found -->
    <div v-if="notFound" class="text-center py-16 md:py-24">
      <h1 class="font-cursive text-4xl md:text-5xl text-int-base mb-8">
        {{ $t('page.notFound.title', 'Page Not Found') }}
      </h1>
      <p class="font-sans text-lg text-txt opacity-75 mb-8">
        {{ $t('page.notFound.message', 'The page you\'re looking for doesn\'t exist.') }}
      </p>
      <div class="text-center">
        <Button 
          :label="$t('page.notFound.backHome', 'Back to Home')" 
          icon="i-solar:home-bold"
          @click="goHome"
          severity="primary"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-else-if="loading" class="flex items-center justify-center py-16 md:py-24">
      <div class="text-center">
        <i class="i-solar:refresh-bold text-4xl text-acc-base mb-4 animate-spin"></i>
        <p class="font-sans text-lg text-txt">{{ $t('page.loading', 'Loading page...') }}</p>
      </div>
    </div>

    <!-- RSVP Gate -->
    <div v-else-if="rsvpGate" class="flex items-center justify-center py-16 md:py-24">
      <RsvpGate
        :reason="rsvpGate"
        :redirect-path="route.fullPath"
      />
    </div>

    <!-- Page Content -->
    <div v-else class="w-full">
      <BlockRenderer :blocks="blocks" :locale="locale" withSurveys />
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { fetchPublicPage } from '@/api/pages';
import BlockRenderer from '@/components/BlockRenderer.vue';
import RsvpGate from '@/components/RsvpGate.vue';

const route = useRoute();
const router = useRouter();
const { locale } = useI18n();

const rsvpGate = ref(null);
const blocks = ref([]);
const loading = ref(true);
const notFound = ref(false);

async function loadPage() {
  loading.value = true;
  notFound.value = false;
  rsvpGate.value = null;
  
  try {
    const data = await fetchPublicPage(route.params.slug, locale.value, true);
    // Assign blocks directly from the response
    blocks.value = data.content || [];
  } catch (err) {
    // Handle RSVP-protected pages by capturing the gate reason
    if (err.response?.status === 403) {
      const reason = err.response.data.reason || 'no_session';
      console.log('RSVP gate triggered:', reason, err.response.data);
      rsvpGate.value = reason;
      return;
    }
    // Handle missing pages
    if (err.response?.status === 404) {
      notFound.value = true;
      return;
    }
    console.error('Error loading public page:', err);
  } finally {
    loading.value = false;
  }
}

function goHome() {
  router.push({ 
    name: 'home', 
    params: { lang: route.params.lang || 'en' } 
  });
}

onMounted(loadPage);
// Reload when the global locale changes
watch(locale, loadPage);
</script>

<style scoped>
/* Minimal custom styles only for specific needs that can't be handled by Tailwind */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Deep styling for content blocks - using Tailwind classes where possible */
:deep(.block-renderer__block) {
  @apply mb-8;
}

:deep(.block-renderer__block:last-child) {
  @apply mb-0;
}

:deep(.block-renderer__block h1) {
  @apply font-serif text-4xl md:text-5xl text-int-base mb-8;
}

:deep(.block-renderer__block h2) {
  @apply font-serif text-2xl md:text-3xl text-txt mb-6;
}

:deep(.block-renderer__block h3) {
  @apply font-serif text-xl md:text-2xl text-txt mb-4;
}

:deep(.block-renderer__block p) {
  @apply font-sans text-base text-txt mb-4;
}

:deep(.block-renderer__block p:last-child) {
  @apply mb-0;
}

:deep(.block-renderer__block img) {
  @apply w-full h-auto rounded-md border border-form-border;
}

:deep(.block-renderer__block ul),
:deep(.block-renderer__block ol) {
  @apply mb-4 pl-6;
}

:deep(.block-renderer__block li) {
  @apply font-sans text-base text-txt mb-2;
}

:deep(.block-renderer__block li:last-child) {
  @apply mb-0;
}

:deep(.block-renderer__block a) {
  @apply text-acc-base hover:text-acc-hover transition-colors duration-200;
}

:deep(.block-renderer__block blockquote) {
  @apply border-l-4 border-acc-base pl-4 py-2 my-4 italic text-txt opacity-75;
}

:deep(.block-renderer__block code) {
  @apply bg-form-background px-2 py-1 rounded text-sm font-mono;
}

:deep(.block-renderer__block pre) {
  @apply bg-form-background p-4 rounded-md overflow-x-auto;
}

:deep(.block-renderer__block pre code) {
  @apply bg-transparent p-0;
}
</style>
