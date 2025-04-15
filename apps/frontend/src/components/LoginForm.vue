<template>
  <form @submit.prevent="handleSubmit" class="max-w-md mx-auto mt-10 p-6 bg-white shadow rounded">
    <h2 class="text-2xl font-bold mb-4">Login</h2>

    <label class="block mb-2">
      <span class="text-gray-700">Email</span>
      <input
        v-model="email"
        type="email"
        required
        class="w-full mt-1 p-2 border rounded"
      />
    </label>

    <label class="block mb-4">
      <span class="text-gray-700">Password</span>
      <input
        v-model="password"
        type="password"
        required
        class="w-full mt-1 p-2 border rounded"
      />
    </label>

    <button
      type="submit"
      class="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
    >
      Log In
    </button>

    <p v-if="error" class="mt-4 text-red-600">{{ error }}</p>
  </form>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '@/api/auth.js';
import { useAuthStore } from '@/store/auth';

const email = ref('');
const password = ref('');
const error = ref('');
const router = useRouter();
const auth = useAuthStore();

const handleSubmit = async () => {
  if (!email.value || !password.value) return;

  try {
    await login({ email: email.value, password: password.value });
    await auth.fetchUser();
    error.value = '';
    email.value = '';
    password.value = '';
    router.push('/admin/overview');
  } catch (err) {
    error.value = err.message;
  }
};
</script>
