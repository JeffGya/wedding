<template>
  <section>
    <h1 class="text-2xl font-semibold mb-4">Template Manager</h1>
 
    <div v-if="loading" class="text-gray-500">Loading templates...</div>
    <div v-else-if="templates.length === 0" class="text-gray-500">No templates found.</div>
 
    <ul v-else class="space-y-4">
      <li
        v-for="template in templates"
        :key="template.id"
        class="p-4 border rounded-md"
      >
        <details>
          <summary class="flex justify-between items-start cursor-pointer">
            <div>
              <h2 class="font-medium text-lg">{{ template.name }}</h2>
              <p class="text-sm text-gray-600">{{ template.subject }}</p>
            </div>
            <div class="flex gap-2">
              <RouterLink
                :to="`/admin/templates/${template.id}/edit`"
                class="text-sm text-blue-600 hover:underline"
              >
                Edit
              </RouterLink>
              <button
                class="text-sm text-red-600 hover:underline"
                @click.stop="deleteTemplate(template.id)"
              >
                Delete
              </button>
            </div>
          </summary>

          <div class="mt-4 space-y-2">
            <div>
              <p class="font-semibold">Body (EN):</p>
              <div class="whitespace-pre-line text-sm text-gray-800 border p-2 rounded bg-gray-50">{{ template.body_en }}</div>
            </div>
            <div>
              <p class="font-semibold">Body (LT):</p>
              <div class="whitespace-pre-line text-sm text-gray-800 border p-2 rounded bg-gray-50">{{ template.body_lt }}</div>
            </div>
          </div>
        </details>
      </li>
    </ul>
  </section>
</template>
 
<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api';
import { useToast as usePrimeToast } from 'primevue/usetoast'

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