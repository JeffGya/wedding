<template>
  <div>
    <button @click="changeLanguage('en')">EN</button>
    <button @click="changeLanguage('lt')">LT</button>
  </div>
</template>

<script>
import i18n from '@/i18n';
import { useI18n } from 'vue-i18n';
import { useLangStore } from '@/store/lang';
import { useRouter } from 'vue-router';
import { defineComponent } from 'vue';

export default defineComponent({
  setup() {
    const langStore = useLangStore();
    const router = useRouter();
    useI18n();

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
      router.push(newPath).catch(err => {
        // ignore redundant navigation errors
        if (err.name !== 'NavigationDuplicated' && err.message.indexOf('Avoided redundant navigation') === -1) {
          console.error('Navigation failed:', err);
        }
      });
    };

    return { changeLanguage };
  }
});
</script>