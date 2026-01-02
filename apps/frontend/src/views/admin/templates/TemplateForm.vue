<template>
  <AdminPageWrapper 
    :title="isEditMode ? 'Edit Template' : 'New Template'"
    description="Create and edit email templates for your guest communications"
  >
    <template #headerActions>
      <Button 
        icon="i-solar-arrow-left-bold-duotone" 
        severity="secondary" 
        text
        @click="$router.push('/admin/templates')"
        v-tooltip.top="'Back to Templates'"
      />
    </template>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main Form -->
      <div class="lg:col-span-2">
        <Card>
          <template #content>
            <form @submit.prevent="saveTemplate" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                
                <div>
                  <FloatLabel variant="in">
                    <Select
                      id="template_style"
                      v-model="form.style"
                      :options="styleOptions"
                      option-label="name"
                      option-value="key"
                      class="w-full"
                      placeholder="Select a style"
                    />
                    <label for="template_style">Style</label>
                  </FloatLabel>
                </div>
              </div>

              <!-- Subject Fields -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <FloatLabel variant="in">
                    <InputText
                      id="template_subject_en"
                      v-model="form.subject_en"
                      class="w-full"
                      placeholder="Enter email subject (English)"
                      required
                    />
                    <label for="template_subject_en">Subject (English)</label>
                  </FloatLabel>
                </div>
                
                <div>
                  <FloatLabel variant="in">
                    <InputText
                      id="template_subject_lt"
                      v-model="form.subject_lt"
                      class="w-full"
                      placeholder="Enter email subject (Lithuanian)"
                      required
                    />
                    <label for="template_subject_lt">Subject (Lithuanian)</label>
                  </FloatLabel>
                </div>
              </div>

              <!-- Language Tabs -->
              <div>
                <div class="mb-4">
                  <SelectButton
                    v-model="activeTab"
                    :options="languageOptions"
                    option-label="label"
                    option-value="value"
                    class="w-full"
                  />
                </div>

                <!-- English Content -->
                <div v-if="activeTab === 'en'">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    English Content
                  </label>
                  <RichTextEditor
                    v-model="form.body_en"
                    :context="'email'"
                    placeholder="Enter English content..."
                  />
                </div>

                <!-- Lithuanian Content -->
                <div v-if="activeTab === 'lt'">
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Lithuanian Content
                  </label>
                  <RichTextEditor
                    v-model="form.body_lt"
                    :context="'email'"
                    placeholder="Enter Lithuanian content..."
                  />
                </div>
              </div>

              <!-- Save Button -->
              <div class="flex justify-end space-x-4">
                <Button
                  type="button"
                  severity="secondary"
                  @click="$router.push('/admin/templates')"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  :loading="saving"
                  :disabled="!form.name || !form.subject_en || !form.subject_lt || !form.body_en || !form.body_lt"
                >
                  {{ isEditMode ? 'Update Template' : 'Create Template' }}
                </Button>
              </div>
            </form>
          </template>
        </Card>
      </div>

      <!-- Variables Helper -->
      <div class="lg:col-span-1">
        <Card>
          <template #title>
            <div class="flex items-center space-x-2">
              <i class="i-solar-info-circle-bold-duotone text-acc-base"></i>
              <span>Available Variables</span>
            </div>
          </template>
          <template #content>
            <div class="space-y-4">
              <div>
                <h4 class="font-semibold text-sm text-gray-700 mb-2">Guest Information</h4>
                <div class="space-y-1">
                  <div class="text-xs text-gray-600">&#123;&#123;guestName&#125;&#125; - Guest's name</div>
                  <div class="text-xs text-gray-600">&#123;&#123;email&#125;&#125; - Guest's email</div>
                  <div class="text-xs text-gray-600">&#123;&#123;groupLabel&#125;&#125; - Guest's group</div>
                  <div class="text-xs text-gray-600">&#123;&#123;code&#125;&#125; or &#123;&#123;rsvpCode&#125;&#125; - RSVP code</div>
                  <div class="text-xs text-gray-600">&#123;&#123;rsvpLink&#125;&#125; - RSVP link (uses website_url from settings)</div>
                  <div class="text-xs text-gray-600">&#123;&#123;plus_one_name&#125;&#125; - Plus one's name</div>
                </div>
              </div>
              
              <div>
                <h4 class="font-semibold text-sm text-gray-700 mb-2">Event Information</h4>
                <div class="space-y-1">
                  <div class="text-xs text-gray-600">&#123;&#123;venueName&#125;&#125; - Venue name</div>
                  <div class="text-xs text-gray-600">&#123;&#123;venueAddress&#125;&#125; - Venue address</div>
                  <div class="text-xs text-gray-600">&#123;&#123;eventStartDate&#125;&#125; - Event date</div>
                  <div class="text-xs text-gray-600">&#123;&#123;eventTime&#125;&#125; - Event time</div>
                  <div class="text-xs text-gray-600">&#123;&#123;rsvpDeadline&#125;&#125; - RSVP deadline</div>
                </div>
              </div>
              
              <div>
                <h4 class="font-semibold text-sm text-gray-700 mb-2">Couple Information</h4>
                <div class="space-y-1">
                  <div class="text-xs text-gray-600">&#123;&#123;brideName&#125;&#125; - Bride's name</div>
                  <div class="text-xs text-gray-600">&#123;&#123;groomName&#125;&#125; - Groom's name</div>
                  <div class="text-xs text-gray-600">&#123;&#123;contactEmail&#125;&#125; - Contact email</div>
                </div>
              </div>
              
              <div>
                <h4 class="font-semibold text-sm text-gray-700 mb-2">Conditional Logic</h4>
                <div class="space-y-1">
                  <div class="text-xs text-gray-600">&#123;&#123;#if variable&#125;&#125;...&#123;&#123;/if&#125;&#125; - Show if variable exists</div>
                  <div class="text-xs text-gray-600">&#123;&#123;#unless variable&#125;&#125;...&#123;&#123;/unless&#125;&#125; - Show if variable doesn't exist</div>
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </AdminPageWrapper>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createTemplate, updateTemplate, fetchTemplate } from '@/api/templates'
import RichTextEditor from '@/components/forms/RichTextEditor.vue'
import { getTemplateStyles } from '@/api/templates';
import { useToastService } from '@/utils/toastService'

const route = useRoute()
const router = useRouter()
const { showSuccess, showError } = useToastService()

const isEditMode = computed(() => route.params.id !== undefined)
const saving = ref(false)
const activeTab = ref('en')
const availableStyles = ref([]);

const styleOptions = ref([])

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Lithuanian', value: 'lt' }
]

const form = ref({
  name: '',
  subject_en: '',
  subject_lt: '',
  body_en: '',
  body_lt: '',
  style: 'elegant'
})

async function loadTemplate() {
  if (!isEditMode.value) return
  
  try {
    const response = await fetchTemplate(route.params.id)
    const template = response.template // Access the template from the response
    
    form.value = {
      name: template.name,
      subject_en: template.subject_en || template.subject || '',
      subject_lt: template.subject_lt || template.subject || '',
      body_en: template.body_en,
      body_lt: template.body_lt,
      style: template.style || 'elegant'
    }
  } catch (error) {
    console.error('Error loading template:', error)
    showError('Error', 'Failed to load template')
  }
}

async function saveTemplate() {
  saving.value = true
  
  try {
    const templateData = {
      name: form.value.name,
      subject_en: form.value.subject_en,
      subject_lt: form.value.subject_lt,
      body_en: form.value.body_en,
      body_lt: form.value.body_lt,
      style: form.value.style
    }
    
    if (isEditMode.value) {
      await updateTemplate(route.params.id, templateData)
      showSuccess('Success', 'Template updated successfully')
    } else {
      await createTemplate(templateData)
      showSuccess('Success', 'Template created successfully')
    }
    
    router.push('/admin/templates')
  } catch (error) {
    console.error('Error saving template:', error)
    showError('Error', 'Failed to save template')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    // Load template styles first
    const response = await getTemplateStyles();
    availableStyles.value = response.styles;
    styleOptions.value = response.styles; // Initialize styleOptions
    
    // Load template data if in edit mode
    if (isEditMode.value) {
      await loadTemplate();
    }
  } catch (error) {
    console.error('Error loading template styles:', error);
  }
});
</script>