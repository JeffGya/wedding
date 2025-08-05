<template>
  <Card>
    <template #title>
      <div class="flex items-center gap-2">
        <i class="pi pi-upload text-acc-base"></i>
        <span>Upload Image</span>
      </div>
    </template>
    <template #content>
      <div class="flex items-center gap-4">
        <p class="text-text">Upload Image</p>
        <Button severity="primary" icon="pi pi-upload">
          <label class="cursor-pointer">
            <input
              type="file"
              accept=".jpg,.png,.gif,.webm"
              hidden
              @change="onFileSelect"
            />
            Choose & Upload
          </label>
        </Button>
      </div>
    </template>
  </Card>
</template>

<script setup>
import { uploadImage } from '@/api/images';
import { useToast } from 'primevue/usetoast';

const toast = useToast();
const emit = defineEmits(['uploaded']);

async function onFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const { id } = await uploadImage(file);
    toast.add({ severity: 'success', summary: 'Uploaded', detail: `Image ID ${id}` });
    emit('uploaded');
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Upload Failed', detail: err.message || err });
  }
}
</script>