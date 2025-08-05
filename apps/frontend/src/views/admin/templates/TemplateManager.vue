<template>
  <AdminPageWrapper 
    title="Template Manager" 
    description="Create and manage email templates for your guest communications"
  >
    <template #headerActions>
      <Button 
        label="New Template" 
        icon="pi pi-plus" 
        severity="primary" 
        @click="$router.push('/admin/templates/new')"
      />
    </template>

    <div v-if="loading" class="flex justify-center items-center py-8">
      <ProgressSpinner />
    </div>

    <div v-else-if="templates.length === 0" class="text-center py-8">
      <div class="text-gray-500 mb-4">
        <i class="pi pi-file-edit text-4xl mb-2"></i>
        <p class="text-lg">No templates found</p>
        <p class="text-sm">Create your first template to get started</p>
      </div>
      <Button 
        label="Create Template" 
        icon="pi pi-plus" 
        severity="primary" 
        @click="$router.push('/admin/templates/new')"
      />
    </div>

    <div v-else class="space-y-4">
      <Card
        v-for="template in templates"
        :key="template.id"
        class="template-card"
      >
        <template #title>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold">{{ template.name }}</h3>
              <p class="text-sm text-gray-600">{{ template.subject }}</p>
            </div>
            <div class="flex gap-2">
              <Button 
                icon="pi pi-pencil" 
                severity="secondary" 
                text
                @click="$router.push(`/admin/templates/${template.id}/edit`)"
                v-tooltip.top="'Edit Template'"
              />
              <Button 
                icon="pi pi-trash" 
                severity="danger" 
                text
                @click="deleteTemplate(template.id)"
                v-tooltip.top="'Delete Template'"
              />
            </div>
          </div>
        </template>
        
        <template #content>
          <div class="space-y-4">
            <div>
              <h4 class="font-semibold text-sm text-gray-700 mb-2">English Content</h4>
              <div class="bg-gray-50 border rounded p-3 text-sm">
                <div v-html="template.body_en" class="prose prose-sm max-w-none"></div>
              </div>
            </div>
            
            <div>
              <h4 class="font-semibold text-sm text-gray-700 mb-2">Lithuanian Content</h4>
              <div class="bg-gray-50 border rounded p-3 text-sm">
                <div v-html="template.body_lt" class="prose prose-sm max-w-none"></div>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Confirmation Dialog -->
    <ConfirmDialog />
  </AdminPageWrapper>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { fetchTemplates, deleteTemplate as deleteTemplateApi } from '@/api/templates'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const templates = ref([])
const loading = ref(true)

onMounted(async () => {
  await loadTemplates()
})

async function loadTemplates() {
  try {
    loading.value = true
    const response = await fetchTemplates()
    templates.value = response.templates
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: 'Failed to load templates.',
      life: 5000
    })
  } finally {
    loading.value = false
  }
}

async function deleteTemplate(id) {
  confirm.require({
    message: 'Are you sure you want to delete this template?',
    header: 'Delete Template',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        await deleteTemplateApi(id)
        templates.value = templates.value.filter(t => t.id !== id)
        toast.add({ 
          severity: 'success', 
          summary: 'Success', 
          detail: 'Template deleted successfully.',
          life: 5000
        })
      } catch (error) {
        toast.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'Failed to delete template.',
          life: 5000
        })
      }
    }
  })
}
</script>