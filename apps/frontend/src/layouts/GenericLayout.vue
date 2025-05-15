<template>
  <div>
    <header>
      <GenericHeader />
    </header>
    <main>
      <router-view :key="$route.fullPath" />
    </main>
    <footer>
      <!-- footer content -->
    </footer>
  </div>
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


