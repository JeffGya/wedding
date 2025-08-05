<template>
  <AdminPageWrapper 
    title="Image Library" 
    description="Manage and organize your wedding website images"
  >
    <Card>
      <template #content>
        <DataTable 
          :value="images" 
          tableStyle="min-width: 30rem" 
          paginator 
          :rows="10" 
          responsiveLayout="scroll"
          stripedRows
          class="w-full"
        >
          <Column header="Preview" style="width: 8rem">
            <template #body="slotProps">
              <img
                :src="slotProps.data.url"
                :alt="slotProps.data.alt_text"
                class="h-12 w-12 object-cover rounded"
              />
            </template>
          </Column>
          
          <Column field="filename" header="Filename" />
          <Column field="alt_text" header="Alt Text" />
          
          <Column field="created_at" header="Created At" style="width: 12rem">
            <template #body="slotProps">
              {{ new Date(slotProps.data.created_at).toLocaleDateString() }}
            </template>
          </Column>
          
          <Column field="updated_at" header="Updated At" style="width: 12rem">
            <template #body="slotProps">
              {{ new Date(slotProps.data.updated_at).toLocaleDateString() }}
            </template>
          </Column>
          
          <Column header="Actions" style="width: 10rem">
            <template #body="slotProps">
              <div class="flex gap-2">
                <Button
                  icon="pi pi-pencil"
                  severity="secondary"
                  text
                  size="small"
                  @click="openEditDialog(slotProps.data)"
                  v-tooltip.top="'Edit Image'"
                />
                <Button
                  icon="pi pi-trash"
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
const toast = useToast();
const confirm = useConfirm();
const editDialog = ref(false);
const editAltText = ref('');
const editFilename = ref('');
const currentImage = ref(null);
const saving = ref(false);

const loadImages = async () => {
  try {
    images.value = await fetchImages();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.message });
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
    icon: 'pi pi-exclamation-triangle',
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