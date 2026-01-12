<template>
  <Card class="h-full">
    <template #title>
      <div class="flex items-center space-x-2">
        <i class="i-solar:eye-bold text-acc-base"></i>
        <span>Live Preview</span>
      </div>
    </template>
    <template #content>
      <div class="flex flex-col h-full">
        <div class="space-y-4 flex-shrink-0">
          <!-- Guest Selector -->
          <div v-if="sampleGuests && sampleGuests.length > 0">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Preview with Guest
            </label>
            <Select
              v-model="selectedGuestId"
              :options="sampleGuests"
              optionLabel="name"
              optionValue="id"
              placeholder="Select a guest for preview"
              class="w-full"
              @change="handleGuestChange"
            />
          </div>

          <!-- Language Tabs -->
          <div>
            <SelectButton
              v-model="activeLanguage"
              :options="languageOptions"
              optionLabel="label"
              optionValue="value"
              class="w-full"
              @change="handleLanguageChange"
            />
          </div>
        </div>

        <!-- Preview Content -->
        <div class="preview-content flex-1 min-h-0">
          <div v-if="loading" class="flex justify-center items-center py-8">
            <ProgressSpinner />
          </div>
          
          <div v-else-if="error" class="text-center py-8 text-red-500">
            <i class="i-solar:exclamation-triangle-bold-duotone text-2xl mb-2"></i>
            <p>{{ error }}</p>
          </div>
          
          <div v-else-if="previewHtml" class="email-preview-container">
            <div class="email-preview-frame">
              <iframe
                :srcdoc="previewHtml"
                class="email-iframe"
                frameborder="0"
                scrolling="yes"
              ></iframe>
            </div>
          </div>
          
          <div v-else class="text-center py-8 text-gray-500">
            <i class="i-solar:document-text-bold text-2xl mb-2"></i>
            <p>Start editing to see preview</p>
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup>
import { ref, watch } from 'vue';
import Card from 'primevue/card';
import Select from 'primevue/select';
import SelectButton from 'primevue/selectbutton';
import ProgressSpinner from 'primevue/progressspinner';

const props = defineProps({
  previewData: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['guest-selected', 'language-changed']);

const selectedGuestId = ref(null);
const activeLanguage = ref('en');
const sampleGuests = ref([]);

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Lithuanian', value: 'lt' }
];

const previewHtml = ref('');

watch(() => props.previewData, (newData) => {
  if (newData) {
    sampleGuests.value = newData.sampleGuests || [];
    if (newData.selectedGuest) {
      selectedGuestId.value = newData.selectedGuest.id;
    } else if (sampleGuests.value.length > 0) {
      selectedGuestId.value = sampleGuests.value[0].id;
    }
    
    updatePreviewHtml();
  }
}, { immediate: true, deep: true });

watch(() => activeLanguage.value, () => {
  updatePreviewHtml();
});

function updatePreviewHtml() {
  if (!props.previewData) {
    previewHtml.value = '';
    return;
  }
  
  if (activeLanguage.value === 'lt') {
    previewHtml.value = props.previewData.email_html_lt || '';
  } else {
    previewHtml.value = props.previewData.email_html_en || '';
  }
}

function handleGuestChange() {
  emit('guest-selected', selectedGuestId.value);
}

function handleLanguageChange() {
  emit('language-changed', activeLanguage.value);
  updatePreviewHtml();
}
</script>

<style scoped>
/* Ensure Card content area gets full height */
:deep(.p-card.h-full) {
  display: flex !important;
  flex-direction: column !important;
}

:deep(.p-card.h-full .p-card-body) {
  flex: 1 1 0% !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
}

:deep(.p-card.h-full .p-card-content) {
  flex: 1 1 0% !important;
  display: flex !important;
  flex-direction: column !important;
  min-height: 0 !important;
}

.preview-content {
  display: flex !important;
  flex-direction: column !important;
  flex: 1 1 0% !important;
  min-height: 0 !important;
}

.email-preview-container {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.email-preview-frame {
  background: #f9fafb;
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
}

.email-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: white;
  overflow-y: auto;
}
</style>

