<template>
    <section class="image-upload flex items-center space-x-4">
        <p>Upload Image</p>
        <Button>
            <label>
                <input
                    type="file"
                    accept=".jpg,.png,.gif,.webm"
                    hidden
                    @change="onFileSelect"
                />
                Choose & Upload
            </label>
        </Button>
    </section>
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

<style scoped>
.image-upload {
  margin-bottom: 2rem;
}
/* Optional: adjust label spacing */
.image-upload .p-button {
  display: inline-flex;
  align-items: center;
}
</style>