<template>
  <section class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-semibold mb-4">
      {{ isEditMode ? 'Edit Template' : 'New Template' }}
    </h1>

    <form @submit.prevent="saveTemplate" class="space-y-4">
      <input v-model="form.name" placeholder="Template Name" class="w-full px-3 py-2 border rounded" />
      <input v-model="form.subject" placeholder="Subject" class="w-full px-3 py-2 border rounded" />

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Body (EN)</label>
        <RichTextEditor v-model="form.body_en" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Body (LT)</label>
        <RichTextEditor v-model="form.body_lt" />
      </div>

      <div class="flex justify-end gap-2">
        <RouterLink to="/admin/templates" class="px-4 py-2 border rounded">Cancel</RouterLink>
        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          {{ isEditMode ? 'Save Changes' : 'Create Template' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import api from '@/api';
import { useToast as usePrimeToast } from 'primevue/usetoast';
import RichTextEditor from '@/components/forms/RichTextEditor.vue'

const primeToast = usePrimeToast();
const route = useRoute()
const router = useRouter()
const isEditMode = ref(!!route.params.id)

const form = ref({
  name: '',
  subject: '',
  body_en: '',
  body_lt: ''
})

onMounted(async () => {
  if (isEditMode.value) {
    try {
      const { data } = await api.get(`/templates/${route.params.id}`)
      form.value = {
        name: data.template.name,
        subject: data.template.subject,
        body_en: data.template.body_en,
        body_lt: data.template.body_lt
      }
    } catch (err) {
      primeToast.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'Failed to load template.',
        life: '4000'
      });
    }
  }
})

async function saveTemplate() {
  try {
    if (isEditMode.value) {
      await api.put(`/templates/${route.params.id}`, form.value)
      primeToast.add({ 
        severity: 'success', 
        summary:  'Success', 
        detail:   'Template updated.',
        life:     '5000'
      });
    } else {
      await api.post('/templates', form.value)
      primeToast.add({ 
        severity: 'success', 
        summary: 'Success', 
        detail: 'Template created.',
        life: '5000'
      });
    }
    router.push('/admin/templates')
  } catch (err) {
    primeToast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: 'Failed to save template.',
      life: '5000'
    });
  }
}
</script>