<template>
    <!-- PrimeVue Select for Language Switching -->
    <Select
      v-model="selectedLanguage"
      :options="languages"
      optionLabel="label"
      optionValue="value"
      :placeholder="currentLanguageLabel"
      @update:modelValue="onModelUpdate"
      @change="onLanguageChange"
    >
      <!-- Custom template for dropdown items -->
      <template #item="{ option }">
        <div class="flex items-center">
          <component :is="option.icon" class="mr-2" width="16" height="16" />
          <span>{{ option.label }}</span>
        </div>
      </template>

      <!-- Custom template for the selected value -->
      <template #value="{ value }">
        <div class="flex items-center">
          <component
            :is="languages.find(lang => lang.value === value)?.icon"
            class="mr-2"
            width="16"
            height="16"
          />
          <span>{{ languages.find(lang => lang.value === value)?.label }}</span>
        </div>
      </template>
    </Select>
</template>

<script>
import i18n from '@/i18n';
import { useI18n } from 'vue-i18n';
import { useLangStore } from '@/store/lang';
import { useRouter, useRoute } from 'vue-router';
import { defineComponent, ref, computed, watch } from 'vue';

import { IconGb, IconLt } from '@iconify-prerendered/vue-circle-flags';

export default defineComponent({
  setup() {
    const langStore = useLangStore();
    const router = useRouter();
    const route = useRoute();
    useI18n();

    // Define available languages with icons
    const languages = ref([
      { label: 'EN', value: 'en', icon: IconGb },
      { label: 'LT', value: 'lt', icon: IconLt },
    ]);

    // Reactive property for the selected language.
    // Initialize from the route param if present, otherwise from the store.
    // This ensures the control reflects the actual URL on first load.
    const selectedLanguage = ref(route.params.lang || langStore.language);

    // Compute the current language label for the placeholder
    const currentLanguageLabel = computed(() => {
      const currentLang = languages.value.find((lang) => lang.value === selectedLanguage.value);
      return currentLang ? currentLang.label : 'Select Language';
    });

    // Normalize event payloads from PrimeVue Select across versions.
    // Some versions emit the primitive value via update:modelValue, while
    // @change can emit either the primitive or the full option object.
    // Keeping both handlers ensures robustness in production.
    const onModelUpdate = (value) => {
      const lang = typeof value === 'string' ? value : value?.value;
      if (lang) changeLanguage(lang);
    };

    // Handle language change from the Select component (fallback for versions emitting @change only)
    const onLanguageChange = (selected) => {
      const lang = typeof selected === 'string' ? selected : selected?.value;
      if (lang) {
        changeLanguage(lang);
      } else {
        console.error('Invalid selection:', selected);
      }
    };

    // Use the existing changeLanguage function
    const changeLanguage = (lang) => {
      console.log(`Attempting to change language to: ${lang}`);
      langStore.setLanguage(lang);
      // correctly set reactive locale
      i18n.global.locale.value = lang;

      // compute new path, preserving query and hash
      const { fullPath } = router.currentRoute.value;
      // split out search and hash
      const [pathname, searchHash = ''] = fullPath.split(/(?=[?#])/);
      const segments = pathname.split('/');
      // replace the lang segment (first segment after leading slash)
      segments[1] = lang;
      const newPath = segments.join('/') + searchHash;

      console.log(`Navigating to: ${newPath}`);
      router.push(newPath).catch((err) => {
        // ignore redundant navigation errors
        if (err.name !== 'NavigationDuplicated' && err.message.indexOf('Avoided redundant navigation') === -1) {
          console.error('Navigation failed:', err);
        }
      });
    };

    // Keep the selector in sync when the URL language changes elsewhere in the app
    // (e.g., header nav click, direct link, back/forward navigation).
    watch(
      () => router.currentRoute.value.params.lang,
      (newLang) => {
        if (newLang && selectedLanguage.value !== newLang) {
          selectedLanguage.value = newLang;
        }
        // Keep store and i18n aligned with the URL to prevent desyncs.
        if (newLang && langStore.language !== newLang) {
          langStore.setLanguage(newLang);
        }
        if (newLang && i18n.global.locale.value !== newLang) {
          i18n.global.locale.value = newLang;
        }
      }
    );

    return {
      languages,
      selectedLanguage,
      currentLanguageLabel,
      onModelUpdate,
      onLanguageChange,
      changeLanguage,
    };
  },
  components: {
    IconGb,
    IconLt,
  },
});
</script>
