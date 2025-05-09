<template>
  <div class="p-6 bg-white shadow rounded">
    <h2 class="text-2xl font-semibold mb-4">Main Settings</h2>
    <form @submit.prevent="saveSettings" class="space-y-4">
      <div>
        <label class="inline-flex items-center">
          <input
            type="checkbox"
            v-model="settings.enable_global_countdown"
            class="form-checkbox"
          />
          <span class="ml-2">Enable wedding countdown on home page</span>
        </label>
      </div>
      <div>
        <label class="block mb-1">Wedding Date</label>
        <VueDatePicker
          v-model="settings.wedding_date"
          type="date"
          placeholder="YYYY-MM-DD"
          class="w-full border px-3 py-2 rounded"
        />
      </div>
      <button
        type="submit"
        class="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Save
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import api from '@/api';

const settings = ref({
  enable_global_countdown: false,
  wedding_date: null
});

const localIsoDate = computed(() => {
  const dt = settings.value.wedding_date;
  if (!dt) return null;
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
});

onMounted(async () => {
  try {
    const { data } = await api.get('/settings/main');
    settings.value.enable_global_countdown = data.enableGlobalCountdown;
    if (data.weddingDate) {
      const [year, month, day] = data.weddingDate.split('-');
      settings.value.wedding_date = new Date(year, month - 1, day);
    } else {
      settings.value.wedding_date = null;
    }
    console.log('Loaded settings:', settings.value);
  } catch (err) {
    console.error('Failed to load main settings', err);
  }
});

const saveSettings = async () => {
  console.log('Saving settings:', settings.value);
  const payload = {
    enable_global_countdown: settings.value.enable_global_countdown,
    wedding_date: localIsoDate.value
  };
  try {
    await api.put('/settings/main', payload);
    console.log('Settings saved successfully');
  } catch (err) {
    console.error('Failed to save settings', err);
  }
};
</script>

<style scoped>
/* Scoped styles for Main Settings */
</style>