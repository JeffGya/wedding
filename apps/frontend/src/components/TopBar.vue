<template>
  <div class="login-bar flex justify-between items-center px-16 md:px-24 xl:px-40">
    <p class="text-base font-serif font-medium">
      Welcome, {{ auth.user?.name || 'Admin' }}!
    </p>
    <Button
      icon="i-solar:logout-3-bold-duotone"
      @click="auth.logout"
      label="Logout"
      size="small"
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
  border-radius: 0 0  .75rem .75rem;
}
</style>