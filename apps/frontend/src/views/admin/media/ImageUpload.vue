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
        <Button severity="primary" label="Choose & Upload">
          <label class="cursor-pointer">
            <i class="solar:upload-bold-duotone"></i>
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
import { useToastService } from '@/utils/toastService';

const { showSuccess, showError } = useToastService();
const emit = defineEmits(['uploaded']);

async function onFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const { id } = await uploadImage(file);
    showSuccess('Uploaded', `Image ID ${id}`);
    emit('uploaded');
  } catch (err) {
    showError('Upload Failed', err.message || err);
  }
}
</script>