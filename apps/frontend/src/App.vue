<template>
    <TopBar v-if="auth.isLoggedIn" />
    <router-view />
</template>

<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from '@/store/auth';
import TopBar from '@/components/TopBar.vue';

const auth = useAuthStore();

onMounted(() => {
  auth.fetchUser();
});
</script>

<style scoped>
/* No scoped styles needed right now */
</style>
