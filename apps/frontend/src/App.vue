<template>
    <SplashScreen :visible="isInitializing" />
    <Alert position="top-center"/>
    <ConfirmDialog />
    <Loader />
    <TopBar v-if="auth.isLoggedIn" />
    <router-view />
</template>

<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from '@/store/auth';
import TopBar from '@/components/TopBar.vue';
import Loader from '@/components/Loader.vue';
import SplashScreen from '@/components/SplashScreen.vue';
import { useAppInitialization } from '@/composables/useAppInitialization';

const auth = useAuthStore();
const { isInitializing } = useAppInitialization();

onMounted(() => {
  auth.fetchUser();
});
</script>

<style scoped>
/* No scoped styles needed right now */
</style>
