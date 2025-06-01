<template>
  <div class="login-bar p-16 h-20 flex justify-between items-center">
    <h1 class="text-2xl font-semibold">
      Welcome, {{ auth.user?.name || 'Admin' }}!
    </h1>
    <Button
      severity="danger"
      icon="i-solar:logout-3-bold-duotone"
      @click="auth.logout"
      label="Logout"
    />
  </div>
</template>

<script setup>
import { useAuthStore } from '@/store/auth';
const auth = useAuthStore();
</script>

<style>
.login-bar {
  background-image: var(--bg-glass);
  border: solid 2px var(--bg-glass-border);
  border-radius: 0 0  1rem 1rem;
}
</style>