<template>
  <div>
    <!-- Not Found -->
    <div v-if="notFound">
      <h2>Page Not Found</h2>
      <p>The page you’re looking for doesn’t exist.</p>
    </div>

    <!-- Loading State -->
    <div v-else-if="loading">
      <p>Loading page...</p>
    </div>

    <!-- RSVP Gate -->
    <RsvpGate
      v-else-if="rsvpGate"
      :reason="rsvpGate"
      :redirect-path="route.fullPath"
    />

    <!-- Page Content -->
    <div v-else>
      <BlockRenderer :blocks="blocks" :locale="locale" withSurveys />
    </div>
  </div>
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
  try {
    const data = await fetchPublicPage(route.params.slug, locale.value, true);
    // Assign blocks directly from the response
    blocks.value = data.content || [];
  } catch (err) {
    // Handle RSVP-protected pages by capturing the gate reason
    if (err.response?.status === 403) {
      rsvpGate.value = err.response.data.reason || 'no_session';
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

onMounted(loadPage);
// Reload when the global locale changes
watch(locale, loadPage);
</script>
