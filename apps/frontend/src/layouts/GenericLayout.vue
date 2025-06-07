<script setup>
import { useHead } from '@vueuse/head'

useHead({
  meta: [
    {
      name: 'robots',
      content: 'noindex, nofollow'
    }
  ]
})
</script>
<template>
    <header>
      <GenericHeader />
    </header>
    <router-view :key="$route.fullPath" />
    <footer>
      <!-- footer content -->
    </footer>
</template>

<script>
import GenericHeader from '@/components/GenericHeader.vue';

export default {
  components: {
    GenericHeader,
  },
};
</script>

<style scoped>
/* Add your styles here */
</style>
