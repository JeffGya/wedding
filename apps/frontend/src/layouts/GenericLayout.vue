<template>
  <div>
    <header>
      <GenericHeader />
      <GenericNav /> <!-- Add this line to include the navigation -->
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
import GenericNav from '@/components/GenericNav.vue';  // Import the navigation component

export default {
  components: {
    GenericHeader,
    GenericNav, // Register the navigation component
  },
};
</script>

<style scoped>
/* Add your styles here */
</style>


