<template>
  <div 
    class="page-header"
    :style="headerStyle"
  >
    <div class="page-header-content">
      <h1 class="page-title">{{ title }}</h1>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    required: true
  },
  headerImageUrl: {
    type: String,
    default: null
  }
});

const headerStyle = computed(() => {
  const styles = {
    '--header-bg-image': props.headerImageUrl ? `url(${props.headerImageUrl})` : 'var(--bg-glass)',
    '--header-bg-color': props.headerImageUrl ? 'transparent' : 'var(--header-bg)'
  };
  
  return styles;
});
</script>

<style scoped>
.page-header {
  @apply relative w-full py-16 md:py-24 lg:py-32 rounded-sm md:rounded-md ring-2 ring-header-border/25 shadow-lg;
  min-height: 100px;
  /* Use CSS custom properties to override inherited gradient */
  background-image: var(--header-bg-image) !important;
  background-color: var(--header-bg-color) !important;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.page-header-content {
  @apply relative z-10 container mx-auto px-16 md:px-40 lg:px-80;
  
}

.page-title {
  @apply font-cursive text-4xl md:text-5xl lg:text-6xl text-center;
  color: var(--int-base);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* Overlay for better text readability when image is present */
.page-header[style*="--header-bg-image: url"]::before {
  content: '';
  @apply absolute inset-0 bg-[var(--header-bg)] backdrop-blur-sm opacity-15 rounded-md;
  outline-width: 1px;
  outline-color: var(--header-border);
}

/* Ensure text is above overlay */
.page-header-content {
  @apply relative z-10;
}
</style>
