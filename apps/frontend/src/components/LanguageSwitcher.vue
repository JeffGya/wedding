<template>
  <div>
    <button @click="changeLanguage('en')">EN</button>
    <button @click="changeLanguage('lt')">LT</button>
  </div>
</template>

<script>
import { useLangStore } from '@/store/lang';
import { useRouter } from 'vue-router';
import { defineComponent } from 'vue';

export default defineComponent({
  setup() {
    const langStore = useLangStore();
    const router = useRouter();

    const changeLanguage = (lang) => {
      console.log(`Attempting to change language to: ${lang}`);
      langStore.setLanguage(lang);

      console.log(`Language in store after change: ${langStore.language}`);

      // Log the current route and what is being pushed
      const currentRoute = router.currentRoute.value;
      console.log(`Current route before navigation: ${currentRoute.path}`);

      router.push({
        name: currentRoute.name,
        params: { ...currentRoute.params, lang },
        query: currentRoute.query,
        hash: currentRoute.hash
      })
        .then(() => {
          console.log(`Navigation successful to: ${lang}`);
          console.log('Now at:', router.currentRoute.value.fullPath);
        })
        .catch((err) => {
          console.error('Navigation failed:', err);
        });
    };

    return { changeLanguage };
  }
});
</script>