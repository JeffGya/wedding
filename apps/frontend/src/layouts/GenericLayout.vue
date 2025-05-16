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


