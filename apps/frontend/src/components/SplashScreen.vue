<template>
  <Transition
    name="splash-fade"
    appear
  >
    <div
      v-if="visible"
      class="splash-screen fixed inset-0 z-[9999] flex flex-col items-center justify-center"
    >
      <!-- Semi-transparent overlay with backdrop blur -->
      <div class="absolute inset-0 splash-background backdrop-blur-3xl"></div>
      
      <!-- Logo and spinner container -->
      <div class="relative z-10 flex flex-col items-center gap-32 drop-shadow-lg">
        <!-- Logo - 30% viewport width with locked aspect ratio -->
        <img
          src="/app-logo.svg"
          alt="Wedding Site Logo"
          class="w-[50vw] md:w-[30vw] lg:w-[20vw] aspect-square object-contain"
        />
        
        <!-- Loading spinner -->
        <ProgressSpinner
          :stroke-width="4"
          class="splash-spinner"
        />
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { defineProps } from 'vue';
import ProgressSpinner from 'primevue/progressspinner';

defineProps({
  visible: {
    type: Boolean,
    required: true
  }
});
</script>

<style scoped>
/* Fade transition */
.splash-fade-enter-active,
.splash-fade-leave-active {
  transition: opacity 0.4s ease-in-out;
}

.splash-fade-enter-from,
.splash-fade-leave-to {
  opacity: 0;
}

.splash-fade-enter-to,
.splash-fade-leave-from {
  opacity: 1;
}

/* Spinner using design tokens */
.splash-spinner :deep(svg circle) {
  stroke: var(--acc-base) !important;
}

/* Splash background using bg-glass design token */
.splash-background {
  background-image: var(--bg-glass) !important;
}
</style>
