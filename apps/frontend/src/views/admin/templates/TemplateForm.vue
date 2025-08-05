<template>
  <AdminPageWrapper 
    :title="isEditMode ? 'Edit Template' : 'New Template'"
    description="Create and edit email templates for your guest communications"
  >
    <template #headerActions>
      <Button 
        icon="pi pi-arrow-left" 
        severity="secondary" 
        text
        @click="$router.push('/admin/templates')"
        v-tooltip.top="'Back to Templates'"
      />
    </template>

    <Card>
      <template #content>
        <form @submit.prevent="saveTemplate" class="space-y-6">
          <div class="grid grid-cols-1 gap-6">
            <!-- Template Name -->
            <div>
              <FloatLabel variant="in">
                <InputText
                  id="template_name"
                  v-model="form.name"
                  class="w-full"
                  placeholder="Enter template name"
                  required
                />
                <label for="template_name">Template Name</label>
              </FloatLabel>
            </div>

            <!-- Subject -->
            <div>
              <FloatLabel variant="in">
                <InputText
                  id="template_subject"
                  v-model="form.subject"
                  class="w-full"
                  placeholder="Enter email subject"
                  required
                />
                <label for="template_subject">Subject</label>
              </FloatLabel>
            </div>

            <!-- Language Tabs -->
            <div>
              <div class="mb-4">
                <SelectButton
                  v-model="activeTab"
                  :options="languageOptions"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full"
                />
              </div>

              <!-- English Content -->
              <div v-show="activeTab === 'en'">
                <label class="block text-sm font-medium mb-2">English Content</label>
                <RichTextEditor v-model="form.body_en" />
              </div>

              <!-- Lithuanian Content -->
              <div v-show="activeTab === 'lt'">
                <label class="block text-sm font-medium mb-2">Lithuanian Content</label>
                <RichTextEditor v-model="form.body_lt" />
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end gap-3 pt-4 border-t">
            <Button
              label="Cancel"
              severity="secondary"
              outlined
              @click="$router.push('/admin/templates')"
            />
            <Button
              label="Save Template"
              icon="pi pi-save"
              type="submit"
              :loading="saving"
            />
          </div>
        </form>
      </template>
    </Card>
  </AdminPageWrapper>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { fetchTemplate, createTemplate, updateTemplate } from '@/api/templates'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const isEditMode = ref(!!route.params.id)
const saving = ref(false)
const activeTab = ref('en')

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Lietuviškai', value: 'lt' }
]

const form = ref({
  name: '',
  subject: '',
  body_en: '',
  body_lt: ''
})

onMounted(async () => {
  if (isEditMode.value) {
    await loadTemplate()
  }
})

async function loadTemplate() {
  try {
    const response = await fetchTemplate(route.params.id)
    const template = response.template
    form.value = {
      name: template.name,
      subject: template.subject,
      body_en: template.body_en,
      body_lt: template.body_lt
    }
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: 'Failed to load template.',
      life: 5000
    })
  }
}

async function saveTemplate() {
  try {
    saving.value = true
    
    if (isEditMode.value) {
      await updateTemplate(route.params.id, form.value)
      toast.add({ 
        severity: 'success', 
        summary: 'Success', 
        detail: 'Template updated successfully.',
        life: 5000
      })
    } else {
      await createTemplate(form.value)
      toast.add({ 
        severity: 'success', 
        summary: 'Success', 
        detail: 'Template created successfully.',
        life: 5000
      })
    }
    
    router.push('/admin/templates')
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: 'Failed to save template.',
      life: 5000
    })
  } finally {
    saving.value = false
  }
}
</script>