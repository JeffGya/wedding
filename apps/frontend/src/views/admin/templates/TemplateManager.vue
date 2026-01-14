<template>
  <AdminPageWrapper 
    title="Template Manager" 
    description="Create and manage email templates for your guest communications"
  >
    <template #headerActions>
      <Button 
        label="New Template" 
        icon="i-solar-plus-circle-bold-duotone" 
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
        icon="i-solar-plus-circle-bold-duotone" 
        severity="primary" 
        @click="$router.push('/admin/templates/new')"
      />
    </div>

    <div v-else class="space-y-8">
      <!-- Pre-built Templates Section -->
      <div class="prebuilt-templates">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Pre-built Templates</h2>
            <p class="text-gray-600 mt-1">Ready-to-use templates for common wedding communications</p>
          </div>
          <Button 
            label="Seed Templates" 
            icon="i-solar-download-bold-duotone" 
            severity="secondary"
            @click="seedTemplates"
            :loading="seeding"
            v-if="prebuiltTemplates.length === 0"
          />
        </div>

        <div v-if="prebuiltTemplates.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            v-for="template in prebuiltTemplates"
            :key="template.id"
            class="template-card hover:shadow-lg transition-shadow cursor-pointer"
            @click="useTemplate(template)"
          >
            <template #title>
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">{{ template.name }}</h3>
                </div>
              </div>
            </template>
            
            <template #content>
              <div class="space-y-3">
                <div>
                  <h4 class="font-medium text-sm text-gray-700 mb-1">Subject</h4>
                  <p class="text-sm text-gray-600 bg-gray-50 p-2 rounded">{{ template.subject_en || template.subject || 'N/A' }}</p>
                </div>
                
                <div>
                  <h4 class="font-medium text-sm text-gray-700 mb-1">Preview</h4>
                  <div class="text-sm text-gray-600 bg-gray-50 p-2 rounded max-h-20 overflow-hidden">
                    {{ getTemplatePreview(template.body_en) }}
                  </div>
                </div>

                <div class="pt-2">
                  <ButtonGroup>
                    <Button 
                      label="Use" 
                      icon="i-solar-copy-bold-duotone" 
                      size="small"
                      @click.stop="useTemplate(template)"
                    />
                    <Button 
                      label="Preview" 
                      icon="i-solar-eye-bold-duotone" 
                      size="small"
                      severity="secondary"
                      @click.stop="previewTemplate(template)"
                    />
                  </ButtonGroup>
                </div>
              </div>
            </template>
          </Card>
        </div>

        <div v-else class="text-center py-8 bg-gray-50 rounded-lg">
          <div class="text-gray-500 mb-4">
            <i class="pi pi-file-edit text-4xl mb-2"></i>
            <p class="text-lg">No pre-built templates</p>
            <p class="text-sm">Click "Seed Templates" to add common wedding email templates</p>
          </div>
        </div>
      </div>

      <!-- Custom Templates Section -->
      <div class="custom-templates">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Custom Templates</h2>
            <p class="text-gray-600 mt-1">Your custom email templates</p>
          </div>
        </div>

        <div v-if="customTemplates.length === 0" class="text-center py-8">
          <div class="text-gray-500 mb-4">
            <i class="pi pi-file-edit text-4xl mb-2"></i>
            <p class="text-lg">No custom templates</p>
            <p class="text-sm">Create your first custom template</p>
          </div>
          <Button 
            label="Create Template" 
            icon="i-solar-plus-circle-bold-duotone" 
            severity="primary" 
            @click="$router.push('/admin/templates/new')"
          />
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            v-for="template in customTemplates"
            :key="template.id"
            class="template-card hover:shadow-lg transition-shadow cursor-pointer"
            @click="useTemplate(template)"
          >
            <template #title>
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">{{ template.name }}</h3>
                </div>
              </div>
            </template>
            
            <template #content>
              <div class="space-y-3">
                <!-- English Subject -->
                <div>
                  <h4 class="font-medium text-sm text-gray-700 mb-1">Subject (English)</h4>
                  <p class="text-sm text-gray-600 bg-gray-50 p-2 rounded">{{ template.subject_en || template.subject || 'N/A' }}</p>
                </div>
                
                <!-- Lithuanian Subject -->
                <div>
                  <h4 class="font-medium text-sm text-gray-700 mb-1">Subject (Lithuanian)</h4>
                  <p class="text-sm text-gray-600 bg-gray-50 p-2 rounded">{{ template.subject_lt || template.subject || 'N/A' }}</p>
                </div>
                
                <!-- English Preview -->
                <div>
                  <h4 class="font-medium text-sm text-gray-700 mb-1">Preview (English)</h4>
                  <div class="text-sm text-gray-600 bg-gray-50 p-2 rounded max-h-20 overflow-hidden">
                    {{ getTemplatePreview(template.body_en) }}
                  </div>
                </div>
                
                <!-- Lithuanian Preview -->
                <div>
                  <h4 class="font-medium text-sm text-gray-700 mb-1">Preview (Lithuanian)</h4>
                  <div class="text-sm text-gray-600 bg-gray-50 p-2 rounded max-h-20 overflow-hidden">
                    {{ getTemplatePreview(template.body_lt) }}
                  </div>
                </div>

                <div class="pt-2">
                  <ButtonGroup>
                    <Button 
                      label="Use" 
                      icon="i-solar-copy-bold-duotone" 
                      size="small"
                      @click.stop="useTemplate(template)"
                    />
                    <Button 
                      label="Preview" 
                      icon="i-solar-eye-bold-duotone" 
                      size="small"
                      severity="secondary"
                      @click.stop="previewTemplate(template)"
                    />
                    <Button 
                      label="Edit" 
                      icon="i-solar-pen-bold-duotone" 
                      severity="contrast"
                      size="small"
                      @click.stop="$router.push(`/admin/templates/${template.id}/edit`)"
                    />
                    <Button 
                      label="Delete" 
                      icon="i-solar-trash-bin-trash-bold-duotone" 
                      severity="danger"
                      size="small"
                      @click.stop="deleteTemplate(template.id)"
                    />
                  </ButtonGroup>
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>
    </div>

    <!-- Confirmation Dialog -->
    <ConfirmDialog />
    
    <!-- Template Preview Dialog -->
    <TemplatePreview
      v-model:visible="previewDialog.visible"
      :template="previewDialog.template"
      title="Template Preview"
      @use-template="useTemplateFromPreview"
    />
  </AdminPageWrapper>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useConfirm } from 'primevue/useconfirm'
import AdminPageWrapper from '@/components/AdminPageWrapper.vue'
import { fetchTemplates, deleteTemplate as deleteTemplateApi, seedTemplates as seedTemplatesApi } from '@/api/templates'
import { getTemplatePreviewWithSample } from '@/utils/htmlTemplates'
import TemplatePreview from '@/components/templates/TemplatePreview.vue'
import { useToastService } from '@/utils/toastService'
import { useLoading } from '@/composables/useLoading'
import { useErrorHandler } from '@/composables/useErrorHandler'

const router = useRouter()
const confirm = useConfirm()
const { showSuccess, showWarning } = useToastService()
const { loading } = useLoading()
const { handleError } = useErrorHandler({ showToast: true })

const templates = ref([])
const seeding = ref(false)

// Preview dialog state
const previewDialog = ref({
  visible: false,
  template: null
})

// Computed properties
const prebuiltTemplates = computed(() => {
  return templates.value.filter(template => 
    !isCustomTemplate(template.name)
  )
})

const customTemplates = computed(() => {
  return templates.value.filter(template => 
    isCustomTemplate(template.name)
  )
})


function isCustomTemplate(templateName) {
  const prebuiltNames = [
    'RSVP Invitation', 'RSVP Reminder', 'Wedding Update',
    'Thank You - Attending', 'Thank You - Not Attending', 'Group-Specific Welcome'
  ]
  return !prebuiltNames.includes(templateName)
}

function useTemplate(template) {
  // Navigate to template edit form with this template
  router.push({
    name: 'admin-template-edit',
    params: { id: template.id }
  })
}

function getTemplatePreview(body) {
  if (!body) return 'No content'
  
  // Use the imported function directly
  return getTemplatePreviewWithSample({ body_en: body }, false)
    .substring(0, 100) + '...'
}

async function seedTemplates() {
  try {
    seeding.value = true
    await seedTemplatesApi() // Call the API
    await loadTemplates() // Reload templates
    showSuccess('Success', 'Templates seeded successfully.', 5000)
  } catch (error) {
    handleError(error, 'Failed to seed templates')
  } finally {
    seeding.value = false
  }
}

onMounted(async () => {
  await loadTemplates()
})

async function loadTemplates() {
  try {
    loading.value = true
    const response = await fetchTemplates()
    templates.value = response.templates
  } catch (error) {
    handleError(error, 'Failed to load templates')
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
        showSuccess('Success', 'Template deleted successfully.', 5000)
      } catch (error) {
        handleError(error, 'Failed to delete template')
      }
    }
  })
}

function previewTemplate(template) {
  previewDialog.value = {
    visible: true,
    template
  }
}

function useTemplateFromPreview(template) {
  // Navigate to template edit form with this template
  router.push({
    name: 'admin-template-edit',
    params: { id: template.id }
  })
}
</script>