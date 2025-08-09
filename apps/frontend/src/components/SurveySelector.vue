<template>
  <div class="survey-selector space-y-16">
    <!-- Existing surveys dropdown -->
    <div class="space-y-8">
      <label class="text-txt font-medium block">Select Survey</label>
      <div class="flex items-center gap-16">
        <div class="flex-1">
          <Select
            v-model="selectedId"
            :options="surveyOptions"
            optionLabel="question"
            optionValue="id"
            placeholder="Choose an existing survey..."
            class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
            :filter="true"
            filterPlaceholder="Search surveys..."
            @change="onSelect"
          />
        </div>
        <Button 
          label="New Survey" 
          icon="pi pi-plus" 
          class="bg-btn-primary-base hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-text"
          @click="showDialog = true" 
        />
      </div>
    </div>

    <!-- Dialog to create new survey inline -->
    <Dialog 
      header="Create New Survey" 
      v-model:visible="showDialog" 
      modal 
      :closable="false"
      class="survey-dialog"
    >
      <div class="space-y-16">
        <div class="space-y-8">
          <label for="question" class="text-txt font-medium block">Question</label>
          <InputText 
            id="question" 
            v-model="newSurvey.question" 
            placeholder="Enter your survey question..."
            class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
          />
        </div>
        
        <div class="space-y-8">
          <label for="type" class="text-txt font-medium block">Type</label>
          <Select
            id="type"
            v-model="newSurvey.type"
            :options="typeOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
          />
        </div>
        
        <div class="space-y-8">
          <label class="text-txt font-medium block">Options</label>
          <div class="space-y-8">
            <div
              v-for="(opt, idx) in newSurvey.options"
              :key="idx"
              class="flex items-center gap-8"
            >
              <InputText 
                v-model="newSurvey.options[idx]" 
                placeholder="Option text" 
                class="flex-1 bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
              />
              <Button 
                icon="pi pi-trash" 
                class="bg-red-600 hover:bg-red-700 text-white"
                @click="removeOption(idx)"
                v-tooltip.top="'Remove Option'"
              />
            </div>
            <Button 
              label="Add Option" 
              icon="pi pi-plus" 
              class="bg-btn-secondary-base hover:bg-btn-secondary-hover active:bg-btn-secondary-active text-btn-secondary-text"
              @click="addOption" 
            />
          </div>
        </div>
        
        <div class="space-y-8">
          <div class="flex items-center gap-16">
            <div class="flex items-center gap-8">
              <Checkbox 
                id="is_required" 
                v-model="newSurvey.is_required" 
                class="text-btn-primary-base"
              />
              <label for="is_required" class="text-txt font-medium">Required</label>
            </div>
            <div class="flex items-center gap-8">
              <Checkbox 
                id="is_anonymous" 
                v-model="newSurvey.is_anonymous" 
                class="text-btn-primary-base"
              />
              <label for="is_anonymous" class="text-txt font-medium">Anonymous</label>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="flex items-center gap-8">
          <Button 
            label="Cancel" 
            class="bg-btn-secondary-base hover:bg-btn-secondary-hover active:bg-btn-secondary-active text-btn-secondary-text"
            @click="showDialog = false" 
          />
          <Button
            label="Save Survey"
            icon="pi pi-save"
            class="bg-btn-primary-base hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-text"
            @click="createNewSurvey"
            :disabled="!canCreate"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { fetchAllSurveys, createSurvey } from '@/api/pages';

// Props: the page ID and the current selected survey ID
const props = defineProps({
  pageId: { type: Number, required: true },
  modelValue: { type: Number, default: null }
});

const emit = defineEmits(['update:modelValue']);

// Local state
const surveyOptions = ref([]);
const selectedId = ref(props.modelValue);
const showDialog = ref(false);

const typeOptions = [
  { label: 'Radio', value: 'radio' },
  { label: 'Checkbox', value: 'checkbox' },
  { label: 'Text', value: 'text' }
];

// Model for new survey inline
const newSurvey = ref({
  question: '',
  type: 'radio',
  options: [''],
  is_required: false,
  is_anonymous: false,
  locale: 'en'
});

// Load existing surveys for this page
async function loadSurveys() {
  // Fetch all surveys and assign directly to options array
  surveyOptions.value = await fetchAllSurveys();
}

onMounted(loadSurveys);

// Handle selection change
function onSelect() {
  emit('update:modelValue', selectedId.value);
}

// Manage options
function addOption() {
  newSurvey.value.options.push('');
}

function removeOption(idx) {
  newSurvey.value.options.splice(idx, 1);
}

// Enable save when question and at least one option (for choice types)
const canCreate = computed(() => {
  if (!newSurvey.value.question.trim()) return false;
  if (newSurvey.value.type === 'text') return true;
  return newSurvey.value.options.every(opt => opt.trim());
});

// Create a new survey via API
async function createNewSurvey() {
  const payload = { ...newSurvey.value, page_id: props.pageId };
  const result = await createSurvey(props.pageId, payload);
  // Refresh list and select the new survey
  await loadSurveys();
  selectedId.value = result.id;
  emit('update:modelValue', result.id);
  // Reset and close dialog
  newSurvey.value = { question: '', type: 'radio', options: [''], is_required: false, is_anonymous: false, locale: 'en' };
  showDialog.value = false;
}
</script>

<style scoped>
.survey-dialog :deep(.p-dialog-header) {
  background: var(--card-bg);
  border-bottom: 1px solid var(--form-border);
  border-radius: 12px 12px 0 0;
}

.survey-dialog :deep(.p-dialog-content) {
  background: var(--card-bg);
  border-radius: 0 0 12px 12px;
  padding: 24px;
}

.survey-dialog :deep(.p-dialog-title) {
  color: var(--text);
  font-weight: 600;
  font-size: 1.125rem;
}

.survey-dialog :deep(.p-dialog-footer) {
  background: var(--card-bg);
  border-top: 1px solid var(--form-border);
  padding: 16px 24px;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .survey-dialog :deep(.p-dialog-content) {
    padding: 16px;
  }
  
  .survey-dialog :deep(.p-dialog-footer) {
    padding: 12px 16px;
  }
}
</style>