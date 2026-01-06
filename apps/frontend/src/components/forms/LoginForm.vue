<template>
  <Card class="bg-card-bg border border-form-border rounded-lg">
    <template #content>
      <Form :model="form" @submit="handleSubmit">
        <div class="space-y-8 mb-16">
          <FloatLabel variant="in">
            <InputText
              id="email"
              v-model="form.email"
              type="email"
              autocomplete="email"
              class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
              :class="{ 'border-red-500': error && !form.email }"
              rules="required|email"
            />
            <label for="email" class="text-txt font-medium">Email</label>
          </FloatLabel>
          <FloatLabel variant="in">
            <Password
              id="password"
              v-model="form.password"
              :feedback="false"
              toggleMask
              class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
              :class="{ 'border-red-500': error && !form.password }"
              rules="required"
            />
            <label for="password" class="text-txt font-medium">Password</label>
          </FloatLabel>
        </div>

        <Button 
          label="Log In" 
          type="submit" 
          class="w-full bg-btn-primary-base hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-text font-semibold rounded-md transition-colors duration-200" 
        />

        <p v-if="error" class="mt-4 text-red-600">{{ error }}</p>
      </Form>
    </template>
  </Card>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '@/api/auth.js';
import { useAuthStore } from '@/store/auth';
import Password from 'primevue/password';

const form = reactive({
  email: '',
  password: ''
});

const error = ref('');
const router = useRouter();
const auth = useAuthStore();

const handleSubmit = async () => {
  if (!form.email || !form.password) return;

  try {
    await login({ email: form.email, password: form.password });
    await auth.fetchUser();
    error.value = '';
    form.email = '';
    form.password = '';
    router.push('/admin/overview');
  } catch (err) {
    error.value = err.message;
  }
};
</script>
