<template>
  <div class="login-bar md:flex md:justify-between md:items-center p-16 pb-8 space-y-8 md:space-y-0 md:px-24 md:pb-16 xl:px-40">
    <p class="text-base font-serif font-medium m-0">
      Welcome, {{ auth.user?.name || 'Admin' }}!
    </p>
    <ButtonGroup class="w-full md:w-auto">
      <Button
        @click="$router.push('/admin/overview')"
        label="Admin Overview"
        severity="contrast"
        variant="outlined"
        size="normal"
      />
      <Button
        @click="$router.push('/')"
        label="Public Site"
        severity="contrast"
        variant="outlined"
        size="normal"
      />
    </ButtonGroup>
    <Button
      icon="i-solar:logout-3-bold-duotone"
      @click="auth.logout"
      label="Logout"
      size="normal"
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