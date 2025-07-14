<template>
  <div class="image-list">
    <ConfirmDialog />
    <h2>Image Library</h2>
    <DataTable :value="images" paginator :rows="10" responsiveLayout="scroll">
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
      <Column field="created_at" header="Created At" />
      <Column field="updated_at" header="Updated At" />
      <Column header="Actions">
        <template #body="slotProps">
          <Button
            icon="i-solar:pen-new-square-bold-duotone"
            @click="openEditDialog(slotProps.data)"
          />
          <Button
            icon="i-solar:trash-bin-minimalistic-bold-duotone"
            @click="confirmDelete(slotProps.data.id)"
          />
        </template>
      </Column>
    </DataTable>

    <Dialog header="Edit Image" v-model:visible="editDialog" modal>
      <div class="p-field">
        <label for="editAltText">Alt Text</label>
        <InputText id="editAltText" v-model="editAltText" />
      </div>
      <div class="p-field">
        <label for="editFilename">Filename (without extension)</label>
        <InputText id="editFilename" v-model="editFilename" />
      </div>
      <template #footer>
        <Button
          label="Cancel"
          @click="editDialog = false"
        />
        <Button label="Save" @click="saveEdit" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import ConfirmDialog from 'primevue/confirmdialog';
import { fetchImages, deleteImage, updateImage } from '@/api/images';
import { useToast } from 'primevue/usetoast';

import { useConfirm } from 'primevue/useconfirm';
const confirm = useConfirm();

const images = ref([]);
const toast = useToast();

// Load images from API
const loadImages = async () => {
  try {
    images.value = await fetchImages();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.message });
  }
};

onMounted(loadImages);
// Allow parent to refresh images
defineExpose({ loadImages });

// Delete handler
const handleDelete = async (id) => {
  try {
    await deleteImage(id);
    toast.add({ severity: 'success', summary: 'Deleted', detail: `Image ${id} deleted` });
    loadImages();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.message });
  }
};

// Edit dialog state
const editDialog = ref(false);
const editAltText = ref('');
const editFilename = ref('');
let editId = null;

const openEditDialog = (image) => {
  editId = image.id;
  editAltText.value = image.alt_text;
  const base = image.filename.includes('.')
    ? image.filename.substring(0, image.filename.lastIndexOf('.'))
    : image.filename;
  editFilename.value = base;
  editDialog.value = true;
};

const saveEdit = async () => {
  try {
    const payload = { alt_text: editAltText.value, filename: editFilename.value };
    const updated = await updateImage(editId, payload);
    toast.add({ severity: 'success', summary: 'Updated', detail: `Image ${updated.id} updated` });
    editDialog.value = false;
    loadImages();
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.message });
  }
};

/**
 * Show confirmation before deleting an image.
 * @param {number} id - ID of the image to delete.
 */
function confirmDelete(id) {
  confirm.require({
    message: 'Are you sure you want to delete this image?',
    header: 'Confirm Delete',
    icon: 'i-solar:shield-warning-bold',
    accept: () => handleDelete(id)
  });
}
</script>

<style scoped>
.p-field {
  margin-top: 1rem;
}
</style>