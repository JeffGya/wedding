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
      <!-- Category Filter -->
      <div class="category-filter-section">
        <TemplateCategoryFilter 
          :templates="templates"
          v-model:selectedCategory="selectedCategory"
        />
      </div>

      <!-- Pre-built Templates Section -->
      <div class="prebuilt-templates" v-if="selectedCategory === 'all' || isPrebuiltCategory">
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

        <div v-if="filteredPrebuiltTemplates.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card
            v-for="template in filteredPrebuiltTemplates"
            :key="template.id"
            class="template-card hover:shadow-lg transition-shadow cursor-pointer"
            @click="useTemplate(template)"
          >
            <template #title>
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900">{{ template.name }}</h3>
                  <p class="text-sm text-gray-600 mt-1">{{ getTemplateCategory(template.name) }}</p>
                </div>
                <Tag 
                  :value="getTemplateCategory(template.name)" 
                  :severity="getCategorySeverity(template.name)"
                  class="text-xs"
                />
              </div>
            </template>
            
            <template #content>
              <div class="space-y-3">
                <div>
                  <h4 class="font-medium text-sm text-gray-700 mb-1">Subject</h4>
                  <p class="text-sm text-gray-600 bg-gray-50 p-2 rounded">{{ template.subject }}</p>
                </div>
                
                <div>
                  <h4 class="font-medium text-sm text-gray-700 mb-1">Preview</h4>
                  <div class="text-sm text-gray-600 bg-gray-50 p-2 rounded max-h-20 overflow-hidden">
                    {{ getTemplatePreview(template.body_en) }}
                  </div>
                </div>

                <div class="flex gap-2 pt-2">
                  <Button 
                    label="Use Template" 
                    icon="i-solar-copy-bold-duotone" 
                    size="small"
                    @click.stop="useTemplate(template)"
                  />
                  <Button 
                    label="Preview" 
                    icon="i-solar-eye-bold-duotone" 
                    size="small"
                    severity="secondary"
                    text
                    @click.stop="previewTemplate(template)"
                  />
                </div>
              </div>
            </template>
          </Card>
        </div>

        <div v-else-if="selectedCategory === 'all'" class="text-center py-8 bg-gray-50 rounded-lg">
          <div class="text-gray-500 mb-4">
            <i class="pi pi-file-edit text-4xl mb-2"></i>
            <p class="text-lg">No pre-built templates</p>
            <p class="text-sm">Click "Seed Templates" to add common wedding email templates</p>
          </div>
        </div>
      </div>

      <!-- Custom Templates Section -->
      <div class="custom-templates" v-if="selectedCategory === 'all' || selectedCategory === 'Custom'">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">Custom Templates</h2>
            <p class="text-gray-600 mt-1">Your custom email templates</p>
          </div>
        </div>

        <div v-if="filteredCustomTemplates.length === 0" class="text-center py-8">
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

        <div v-else class="space-y-4">
          <Card
            v-for="template in filteredCustomTemplates"
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
                    icon="i-solar-pen-bold-duotone" 
                    severity="secondary" 
                    text
                    @click="$router.push(`/admin/templates/${template.id}/edit`)"
                    v-tooltip.top="'Edit Template'"
                  />
                  <Button 
                    icon="i-solar-eye-bold-duotone" 
                    severity="info" 
                    text
                    @click="previewTemplate(template)"
                    v-tooltip.top="'Preview Template'"
                  />
                  <Button 
                    icon="i-solar-trash-bin-trash-bold-duotone" 
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
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { 
  fetchTemplates, 
  deleteTemplate as deleteTemplateApi,
  seedTemplates as seedTemplatesApi 
} from '@/api/templates'
import TemplatePreview from '@/components/templates/TemplatePreview.vue'
import TemplateCategoryFilter from '@/components/templates/TemplateCategoryFilter.vue'
import { 
  getTemplateCategory, 
  getCategorySeverity, 
  filterTemplatesByCategory 
} from '@/utils/templateCategories'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const templates = ref([])
const loading = ref(true)
const seeding = ref(false)
const selectedCategory = ref('all')

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

const filteredPrebuiltTemplates = computed(() => {
  if (selectedCategory.value === 'all') {
    return prebuiltTemplates.value
  }
  return filterTemplatesByCategory(prebuiltTemplates.value, selectedCategory.value)
})

const filteredCustomTemplates = computed(() => {
  if (selectedCategory.value === 'all') {
    return customTemplates.value
  }
  return filterTemplatesByCategory(customTemplates.value, selectedCategory.value)
})

const isPrebuiltCategory = computed(() => {
  return selectedCategory.value !== 'Custom' && selectedCategory.value !== 'all'
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
  return body
    .replace(/\{\{[^}]+\}\}/g, '[Variable]')
    .replace(/\{\{#if[^}]+\}\}[\s\S]*?\{\{\/if\}\}/g, '[Conditional]')
    .substring(0, 100) + '...'
}

async function seedTemplates() {
  try {
    seeding.value = true
    await seedTemplatesApi() // Call the API
    await loadTemplates() // Reload templates
    toast.add({ 
      severity: 'success', 
      summary: 'Success', 
      detail: 'Templates seeded successfully.',
      life: 5000
    })
  } catch (error) {
    toast.add({ 
      severity: 'error', 
      summary: 'Error', 
      detail: 'Failed to seed templates.',
      life: 5000
    })
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