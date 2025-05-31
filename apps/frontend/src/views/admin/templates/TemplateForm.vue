<template>
  <Card class="max-w-2xl mx-auto mt-6">
    <template #content>
      <Form @submit="saveTemplate" class="space-y-4">
        <h1 class="text-2xl font-semibold mb-0">
          {{ isEditMode ? 'Edit Template' : 'New Template' }}
        </h1>

        <FloatLabel variant="in">
          <InputText
            id="template_name"
            v-model="form.name"
            class="w-full"
            placeholder="Template Name"
            required
          />
          <label for="template_name">Template Name</label>
        </FloatLabel>
        <FloatLabel variant="in">
          <InputText
            id="template_subject"
            v-model="form.subject"
            class="w-full"
            placeholder="Subject"
            required
          />
          <label for="template_subject">Subject</label>
        </FloatLabel>

        <div>
          <label>Body (EN)</label>
          <RichTextEditor
            v-model="form.body_en"
          />
        </div>

        <div>
          <label>Body (LT)</label>
          <RichTextEditor
            v-model="form.body_lt"
          />
        </div>

        <div class="flex justify-end gap-2">
          <Button
            label="Cancel"
            class="p-button-outlined"
            @click="router.push('/admin/templates')"
          />
          <Button
            label="Save"
            type="submit"
            class="p-button-primary"
          />
        </div>
      </Form>
    </template>
  </Card>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api';
import { useToast as usePrimeToast } from 'primevue/usetoast';
import RichTextEditor from '@/components/forms/RichTextEditor.vue'

import { useRouter } from 'vue-router';

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