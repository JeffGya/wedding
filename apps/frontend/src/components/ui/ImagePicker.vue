<template>
  <Dialog
    header="Select Image"
    :visible="visible"
    @update:visible="val => emit('update:visible', val)"
    width="600px"
    modal
    class="image-picker-dialog"
  >
    <div class="space-y-16">
      <div v-if="loading" class="text-center py-32">
        <ProgressSpinner size="large" />
        <p class="text-txt mt-16">Loading images...</p>
      </div>
      
      <div v-else-if="images.length === 0" class="text-center py-32">
        <i class="pi pi-image text-4xl text-gray-400 mb-16"></i>
        <p class="text-txt">No images available</p>
      </div>
      
      <DataTable 
        v-else
        :value="images" 
        paginator 
        :rows="10" 
        responsiveLayout="scroll"
        class="image-picker-table"
      >
        <Column header="Preview" class="preview-column">
          <template #body="slotProps">
            <div class="image-preview">
              <img
                :src="slotProps.data.url"
                :alt="slotProps.data.alt_text"
                class="preview-image"
                @error="handleImageError"
              />
            </div>
          </template>
        </Column>
        
        <Column field="filename" header="Filename" class="filename-column">
          <template #body="slotProps">
            <span class="text-txt font-medium">{{ slotProps.data.filename }}</span>
          </template>
        </Column>
        
        <Column field="alt_text" header="Alt Text" class="alt-text-column">
          <template #body="slotProps">
            <span class="text-txt">{{ slotProps.data.alt_text || 'No alt text' }}</span>
          </template>
        </Column>
        
        <Column header="Actions" class="actions-column">
          <template #body="slotProps">
            <Button
              label="Select"
              icon="pi pi-check"
              class="select-button"
              @click="select(slotProps.data)"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
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

function handleImageError(event) {
  // Replace broken image with placeholder
  event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik01MCAyNUMyNy45MDg2IDI1IDAgNTIuOTA4NiAwIDgwQzAgMTA3LjA5MSAyNy45MDg2IDEzNSA1MCAxMzVDNzIuMDkxNCAxMzUgMTAwIDEwNy4wOTEgMTAwIDgwQzEwMCA1Mi45MDg2IDcyLjA5MTQgMjUgNTAgMjVaIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik01MCA2NUM0My42NDg2IDY1IDM4LjUgNzAuMTQ4NiAzOC41IDc2LjVDMzguNSA4Mi44NTE0IDQzLjY0ODYgODggNTAgODhDNTYuMzUxNCA4OCA2MS41IDgyLjg1MTQgNjEuNSA3Ni41QzYxLjUgNzAuMTQ4NiA1Ni4zNTE0IDY1IDUwIDY1WiIgZmlsbD0iI0Q5RDlEOSIvPgo8cGF0aCBkPSJNNTAgOTVDMzUuNjQ4NiA5NSAyNC4xNDg2IDgzLjUgMjQuMTQ4NiA2OUMyNC4xNDg2IDU0LjUgMzUuNjQ4NiA0MyA1MCA0M0M2NC4zNTE0IDQzIDc1Ljg1MTQgNTQuNSA3NS44NTE0IDY5Qzc1Ljg1MTQgODMuNSA2NC4zNTE0IDk1IDUwIDk1WiIgZmlsbD0iI0Q5RDlEOSIvPgo8L3N2Zz4K';
}
</script>

<style scoped>
.image-picker-dialog {
  border-radius: 12px;
}

.image-picker-dialog :deep(.p-dialog-header) {
  background: var(--card-bg);
  border-bottom: 1px solid var(--form-border);
  border-radius: 12px 12px 0 0;
}

.image-picker-dialog :deep(.p-dialog-content) {
  background: var(--card-bg);
  border-radius: 0 0 12px 12px;
  padding: 24px;
}

.image-picker-dialog :deep(.p-dialog-title) {
  color: var(--text);
  font-weight: 600;
  font-size: 1.125rem;
}

.image-picker-table {
  border: 1px solid var(--form-border);
  border-radius: 8px;
  overflow: hidden;
}

.image-picker-table :deep(.p-datatable-header) {
  background: var(--form-bg);
  border-bottom: 1px solid var(--form-border);
  padding: 16px;
}

.image-picker-table :deep(.p-datatable-thead > tr > th) {
  background: var(--form-bg);
  border-bottom: 1px solid var(--form-border);
  color: var(--text);
  font-weight: 600;
  padding: 12px 16px;
}

.image-picker-table :deep(.p-datatable-tbody > tr) {
  border-bottom: 1px solid var(--form-border);
  transition: background-color 0.2s ease;
}

.image-picker-table :deep(.p-datatable-tbody > tr:hover) {
  background: var(--form-bg-hover);
}

.image-picker-table :deep(.p-datatable-tbody > tr > td) {
  padding: 12px 16px;
  border: none;
}

.image-picker-table :deep(.p-paginator) {
  background: var(--form-bg);
  border-top: 1px solid var(--form-border);
  padding: 12px 16px;
}

.image-picker-table :deep(.p-paginator .p-paginator-pages .p-paginator-page) {
  background: var(--form-bg);
  border: 1px solid var(--form-border);
  color: var(--text);
  transition: all 0.2s ease;
}

.image-picker-table :deep(.p-paginator .p-paginator-pages .p-paginator-page:hover) {
  background: var(--form-bg-hover);
  border-color: var(--form-border-hover);
}

.image-picker-table :deep(.p-paginator .p-paginator-pages .p-paginator-page.p-highlight) {
  background: var(--btn-primary-base);
  border-color: var(--btn-primary-base);
  color: var(--btn-primary-text);
}

.preview-column {
  width: 80px;
}

.image-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--form-bg);
  border: 1px solid var(--form-border);
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.filename-column {
  min-width: 150px;
}

.alt-text-column {
  min-width: 120px;
}

.actions-column {
  width: 100px;
}

.select-button {
  background: var(--btn-primary-base);
  border-color: var(--btn-primary-base);
  color: var(--btn-primary-text);
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.select-button:hover {
  background: var(--btn-primary-hover);
  border-color: var(--btn-primary-hover);
  transform: translateY(-1px);
}

.select-button:active {
  background: var(--btn-primary-active);
  border-color: var(--btn-primary-active);
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .image-picker-dialog :deep(.p-dialog) {
    width: 95vw !important;
    max-width: 500px;
  }
  
  .image-picker-dialog :deep(.p-dialog-content) {
    padding: 16px;
  }
  
  .image-picker-table :deep(.p-datatable-thead > tr > th),
  .image-picker-table :deep(.p-datatable-tbody > tr > td) {
    padding: 8px 12px;
  }
  
  .preview-image {
    width: 50px;
    height: 50px;
  }
  
  .filename-column,
  .alt-text-column {
    min-width: 100px;
  }
}

@media (max-width: 480px) {
  .image-picker-table :deep(.p-datatable-thead > tr > th),
  .image-picker-table :deep(.p-datatable-tbody > tr > td) {
    padding: 6px 8px;
    font-size: 0.875rem;
  }
  
  .select-button {
    padding: 6px 12px;
    font-size: 0.875rem;
  }
}
</style>
