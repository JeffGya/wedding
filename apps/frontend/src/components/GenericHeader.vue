<template>
  <header>
    <div class="logo">
      <router-link to="/en">Wedding Logo</router-link> <!-- Add logo or name here -->
    </div>
    <div class="language-toggle">
      <LanguageSwitcher />  <!-- Language switcher component -->
    </div>
  </header>
</template>

<script>
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';

export default {
  components: {
    LanguageSwitcher
  }
};
</script>

<style scoped>
header {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background-color: #f8f8f8;
}

nav {
  display: flex;
  gap: 20px;
}

.language-toggle {
  display: flex;
  gap: 10px;
}

button {
  padding: 5px 10px;
  border: none;
  cursor: pointer;
}

button:hover {
  background-color: #ddd;
}
</style>