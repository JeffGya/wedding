<template>
    <Card>
      <template #content>
        <Form @submit="handleSubmit">
          <div class="space-y-8 mb-16">
            <FloatLabel variant="in">
              <InputText
                id="email"
                v-model="email"
                type="email"
                autocomplete="email"
                class="w-full"
                required
              />
              <label for="email">Email</label>
            </FloatLabel>
            <FloatLabel variant="in">
              <Password
                id="password"
                v-model="password"
                :feedback="false"
                toggleMask
                class="w-full"
                required
              />
              <label for="password">Password</label>
            </FloatLabel>
          </div>

          <Button label="Log In" type="submit" class="w-full" />

          <p v-if="error" class="mt-4 text-red-600">{{ error }}</p>
        </Form>
      </template>
    </Card>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '@/api/auth.js';
import { useAuthStore } from '@/store/auth';
import Password from 'primevue/password';

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
