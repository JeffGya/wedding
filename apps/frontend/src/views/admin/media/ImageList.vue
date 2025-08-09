<template>
  <AdminPageWrapper 
    title="Media Library" 
    description="Manage your uploaded images"
  >
    <template #headerActions>
      <Button 
        icon="i-solar:upload-bold-duotone" 
        label="Upload Image" 
        @click="$router.push('/admin/media/upload')"
      />
    </template>

    <Card>
      <template #content>
        <DataTable 
          :value="images" 
          :loading="loading"
          paginator 
          :rows="10"
          :rowsPerPageOptions="[10, 20, 50]"
          filterDisplay="menu"
          :globalFilterFields="['filename', 'alt_text']"
        >
          <Column field="filename" header="Filename" sortable>
            <template #body="slotProps">
              <div class="flex items-center gap-2">
                <img 
                  :src="slotProps.data.url" 
                  :alt="slotProps.data.alt_text || slotProps.data.filename"
                  class="w-8 h-8 object-cover rounded"
                />
                <span>{{ slotProps.data.filename }}</span>
              </div>
            </template>
          </Column>
          <Column field="alt_text" header="Alt Text" sortable>
            <template #body="slotProps">
              {{ slotProps.data.alt_text || 'No alt text' }}
            </template>
          </Column>
          <Column field="created_at" header="Uploaded" sortable>
            <template #body="slotProps">
              {{ new Date(slotProps.data.created_at).toLocaleDateString() }}
            </template>
          </Column>
          <Column header="Actions" style="width: 10rem">
            <template #body="slotProps">
              <div class="flex gap-2">
                <Button
                  icon="i-solar:pen-bold-duotone"
                  severity="secondary"
                  text
                  size="small"
                  @click="openEditDialog(slotProps.data)"
                  v-tooltip.top="'Edit Image'"
                />
                <Button
                  icon="i-solar:trash-bin-trash-bold-duotone"
                  severity="danger"
                  text
                  size="small"
                  @click="confirmDelete(slotProps.data.id)"
                  v-tooltip.top="'Delete Image'"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <Dialog 
      header="Edit Image" 
      v-model:visible="editDialog" 
      modal
      :style="{ width: '40rem' }"
      :breakpoints="{ '960px': '75vw', '641px': '90vw' }"
    >
      <div class="space-y-4">
        <div>
          <label for="editAltText" class="block text-sm font-medium text-text mb-2">Alt Text</label>
          <InputText id="editAltText" v-model="editAltText" class="w-full" />
        </div>
        <div>
          <label for="editFilename" class="block text-sm font-medium text-text mb-2">Filename (without extension)</label>
          <InputText id="editFilename" v-model="editFilename" class="w-full" />
        </div>
      </div>
      
      <template #footer>
        <div class="flex gap-2 justify-end">
          <Button
            label="Cancel"
            severity="secondary"
            text
            @click="editDialog = false"
          />
          <Button 
            label="Save" 
            @click="saveEdit"
            :loading="saving"
          />
        </div>
      </template>
    </Dialog>
  </AdminPageWrapper>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import AdminPageWrapper from '@/components/AdminPageWrapper.vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Card from 'primevue/card';
import { fetchImages, deleteImage, updateImage } from '@/api/images';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';

const images = ref([]);
const loading = ref(false);
const toast = useToast();
const confirm = useConfirm();
const editDialog = ref(false);
const editAltText = ref('');
const editFilename = ref('');
const currentImage = ref(null);
const saving = ref(false);

const loadImages = async () => {
  loading.value = true;
  try {
    images.value = await fetchImages();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.message });
  } finally {
    loading.value = false;
  }
};

const openEditDialog = (image) => {
  currentImage.value = image;
  editAltText.value = image.alt_text || '';
  editFilename.value = image.filename || '';
  editDialog.value = true;
};

const saveEdit = async () => {
  saving.value = true;
  try {
    await updateImage(currentImage.value.id, {
      alt_text: editAltText.value,
      filename: editFilename.value
    });
    editDialog.value = false;
    await loadImages();
    toast.add({ severity: 'success', summary: 'Success', detail: 'Image updated successfully' });
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.message });
  } finally {
    saving.value = false;
  }
};

const confirmDelete = (id) => {
  confirm.require({
    message: 'Are you sure you want to delete this image?',
    header: 'Delete Confirmation',
    icon: 'i-solar:exclamation-triangle-bold-duotone',
    accept: async () => {
      try {
        await deleteImage(id);
        await loadImages();
        toast.add({ severity: 'success', summary: 'Success', detail: 'Image deleted successfully' });
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: err.message });
      }
    }
  });
};

onMounted(loadImages);

defineExpose({ loadImages });
</script>