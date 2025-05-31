<template>
  <Card>
    <template #content>
      <Banner
          v-if="message"
          :message="message"
          :type="success ? 'success' : 'error'"
          class="mt-4"
        />
      <Form @submit="saveSettings" class="space-y-4">
        <div class="flex items-center">
          <ToggleSwitch
            id="enable_global_countdown"
            v-model="settings.enable_global_countdown"
            :on-label="'Yes'"
            :off-label="'No'"
            class="mr-2"
          />
          <label for="enable_global_countdown" class="font-medium">
            Enable wedding countdown on home page
          </label>
        </div>
        <div>
          <FloatLabel variant="in">
            <DatePicker
              v-model="settings.wedding_date"
              dateFormat="yy-mm-dd"
              class="w-full"
            />
            <label>Wedding Date - YYYY-MM-DD</label>
          </FloatLabel>
        </div>
        <Button
          label="Save Countdown Setting"
          type="submit"
          class="p-button-primary"
        />
      </Form>
    </template>
  </Card>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '@/api';
import Banner from '@/components/ui/Banner.vue';

const settings = ref({
  enable_global_countdown: false,
  wedding_date: null
});
const message = ref('');
const success = ref(false);

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
    message.value = 'Settings saved successfully';
    success.value = true;
  } catch (err) {
    message.value = 'Failed to save settings';
    success.value = false;
  }
};
</script>

<style scoped>
/* Scoped styles for Main Settings */
</style>