<template>
  <section>
    <h1 class="text-2xl font-semibold mb-4">Template Manager</h1>
 
    <div v-if="loading" class="text-gray-500">Loading templates...</div>
    <div v-else-if="templates.length === 0" class="text-gray-500">No templates found.</div>
 
    <div v-else class="space-y-4">
      <Panel
        v-for="template in templates"
        :key="template.id"
        :header="template.name"
        toggleable
        :collapsed="true"
      > 
        <p class="font-semibold">Subject:</p>
        <p class="text-base mb-2">{{ template.subject }}</p>
        <div class="mt-2 space-y-4">
          <div>
            <p class="font-semibold">Body (EN):</p>
            <div class="whitespace-pre-line text-sm text-gray-800 border p-2 rounded bg-gray-50">
              {{ template.body_en }}
            </div>
          </div>
          <div>
            <p class="font-semibold">Body (LT):</p>
            <div class="whitespace-pre-line text-sm text-gray-800 border p-2 rounded bg-gray-50">
              {{ template.body_lt }}
            </div>
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <ButtonGroup>
              <Button
                label="Delete"
                icon="i-solar:trash-bin-minimalistic-bold-duotone"
                severity="danger"
                @click="deleteTemplate(template.id)"
              />
              <Button
                label="Edit"
                icon="i-solar:pen-new-square-bold-duotone"
                @click="router.push(`/admin/templates/${template.id}/edit`)"
              />
            </ButtonGroup>
          </div>
        </template>
      </Panel>
    </div>
  </section>
</template>
 
<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api';
import { useToast as usePrimeToast } from 'primevue/usetoast'
import { useRouter } from 'vue-router';

const router = useRouter();

const primeToast = usePrimeToast()
const templates = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await api.get('/templates')
    templates.value = res.data.templates
  } catch (err) {
    primeToast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: 'Failed to load templates.',
      life: '5000'
    });
  } finally {
    loading.value = false
  }
})

async function deleteTemplate(id) {
  try {
    await api.delete(`/templates/${id}`)
    templates.value = templates.value.filter(t => t.id !== id)
    primeToast.add({ 
      severity: 'success', 
      summary: 'Success', 
      detail: 'Template deleted',
      life: '5000'
    });
  } catch (err) {
    primeToast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: 'Failed to delete template.',
      life: '5000' 
    });
  }
}
</script>