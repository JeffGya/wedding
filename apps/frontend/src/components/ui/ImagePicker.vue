<template>
  <Dialog
    header="Select Image"
    :visible="visible"
    @update:visible="val => emit('update:visible', val)"
    width="600px"
    modal
  >
    <DataTable :value="images" :loading="loading" paginator :rows="10" responsiveLayout="scroll">
      <Column header="Preview">
        <template #body="slotProps">
          <img
            :src="slotProps.data.url"
            :alt="slotProps.data.alt_text"
            style="height: 50px;"
          />
        </template>
      </Column>
      <Column field="filename" header="Filename" />
      <Column field="alt_text" header="Alt Text" />
      <Column header="Actions">
        <template #body="slotProps">
          <Button
            label="Select"
            icon="pi pi-check"
            class="p-button-text"
            @click="select(slotProps.data)"
          />
        </template>
      </Column>
    </DataTable>
  </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { fetchImages } from '@/api/images';

const props = defineProps({
  visible: { type: Boolean, default: false }
});
const emit = defineEmits(['update:visible', 'select']);

const images = ref([]);
const loading = ref(false);

// Load images when dialog becomes visible
watch(
  () => props.visible,
  async (val) => {
    if (val) {
      loading.value = true;
      try {
        images.value = await fetchImages();
      } catch (err) {
        console.error('Failed to load images:', err);
      } finally {
        loading.value = false;
      }
    }
  }
);

function select(image) {
  emit('select', image.url);
  emit('update:visible', false);
}
</script>

<style scoped>
.image-picker img {
  object-fit: cover;
}
</style>
