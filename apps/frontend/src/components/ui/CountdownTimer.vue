

<template>
  <div v-if="!expired" class="my-4">
    <p font="text-sm">You have
    <span class="font-serif font-semibold text-base">
      {{ days }}d {{ hours }}h {{ minutes }}m
    </span>
    to confirm your rsvp. </p> 
    <p>
      <em>No RSVP means not attending.</em>
    </p>
  </div>
  <div v-else class="text-center my-4 text-red-600">
    RSVP Closed
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

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
const timeLeft = ref(Math.max(0, deadlineDate.value - new Date()));

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