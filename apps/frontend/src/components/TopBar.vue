<template>
  <header class="bg-white shadow px-6 py-4 flex justify-between items-center">
    <h1 class="text-lg font-semibold text-gray-800">
      Welcome, {{ auth.user?.name || 'Admin' }}!
    </h1>
    <button
      @click="auth.logout"
      class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
    >
      Logout
    </button>
  </header>
</template>

<script setup>
import { useAuthStore } from '@/store/auth';
const auth = useAuthStore();
</script>
