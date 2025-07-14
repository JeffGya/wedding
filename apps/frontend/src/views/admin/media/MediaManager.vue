<template>
  <div class="media-manager">
    <ImageUpload @uploaded="onUploaded" />
    <ImageList ref="list" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ImageUpload from './ImageUpload.vue';
import ImageList from './ImageList.vue';

const list = ref(null);

const onUploaded = () => {
  if (list.value && list.value.loadImages) {
    list.value.loadImages();
  }
};
</script>

<style scoped>
</style>
