

<template>
  <div v-if="!expired" class="text-sm">
      No RSVP = not attending. You have
        <span class="font-bold">
          {{ days }}d {{ hours }}h {{ minutes }}m
        </span>
      to confirm your rsvp. 
  </div>
  <Banner v-else type="error" message="RSVPs are closed"/>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import Banner from '@/components/ui/Banner.vue';

// Define props
const props = defineProps({
  deadline: {
    type: [String, Date],
    required: true
  }
});

// Emit event when expired
const emit = defineEmits(['expired']);

// Parse deadline into Date
const deadlineDate = computed(() =>
  typeof props.deadline === 'string'
    ? new Date(props.deadline)
    : props.deadline
);

// Reactive time remaining in milliseconds
const timeLeft = ref(0);

// Watch for changes to deadlineDate and reset timeLeft
watch(deadlineDate, (newVal) => {
  timeLeft.value = Math.max(0, newVal - new Date());
});

// Computed breakdown
const days = computed(() => Math.floor(timeLeft.value / (1000 * 60 * 60 * 24)));
const hours = computed(() => Math.floor((timeLeft.value / (1000 * 60 * 60)) % 24));
const minutes = computed(() => Math.floor((timeLeft.value / (1000 * 60)) % 60));
const seconds = computed(() => Math.floor((timeLeft.value / 1000) % 60));

// Expiration flag
const expired = computed(() => timeLeft.value <= 0);

let timer = null;

// Update loop
onMounted(() => {
  // Initialize timeLeft now that deadlineDate is available
  timeLeft.value = Math.max(0, deadlineDate.value - new Date());
  timer = setInterval(() => {
    const diff = deadlineDate.value - new Date();
    timeLeft.value = Math.max(0, diff);
    if (timeLeft.value === 0) {
      emit('expired');
      clearInterval(timer);
    }
  }, 1000);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.font-mono {
  font-family: monospace;
}
</style>