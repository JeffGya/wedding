<template>
  <div class="survey-selector space-y-16">
    <!-- Existing surveys dropdown -->
    <div class="space-y-8">
      <label class="text-txt font-medium block">Choose a survey</label>
      <div class="flex gap-16">
        <div class="flex-1">
          <Select
            class="w-full"
            v-model="selectedId"
            :options="surveyOptions"
            optionLabel="question"
            optionValue="id"
            placeholder="Choose an existing survey..."
            :filter="true"
            filterPlaceholder="Search surveys..."
            @change="onSelect"
          />
        </div>
        <Button 
          label="New Survey" 
          icon="i-solar:add-circle-bold-duotone"
          severity="secondary"
          size="normal"
          @click="showDialog = true" 
        />
      </div>
    </div>

    <!-- Dialog to create new survey inline -->
    <Dialog 
      header="Create a new survey" 
      v-model:visible="showDialog" 
      modal 
      :closable="false"
      class="survey-dialog"
    >
      <div class="space-y-16">
        <div class="space-y-8">
          <label for="question" class="text-txt font-medium">What will be the question?</label>
          <InputText 
            id="question" 
            v-model="newSurvey.question" 
            placeholder="Enter your survey question..."
            class="w-full"
          />
        </div>
        
        <div class="space-y-8">
          <label for="type" class="text-txt font-medium">What type of survey will it be?</label>
          <Select
            id="type"
            v-model="newSurvey.type"
            :options="typeOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>
        
        <div class="space-y-8">
          <label class="text-txt font-medium">Which response options will be available?</label>
          <div class="space-y-8">
            <div
              v-for="(opt, idx) in newSurvey.options"
              :key="idx"
              class="flex items-center gap-8"
            >
              <InputText 
                v-model="newSurvey.options[idx]" 
                placeholder="Option text"
                class="w-full"
              />
              <Button 
                icon="i-solar:trash-bin-trash-bold-duotone"
                size="normal"
                severity="danger"
                @click="removeOption(idx)"
                v-tooltip.top="'Remove response option'"
              />
            </div>
            <Button 
              label="Add a option" 
              class="mt-16"
              icon="i-solar:add-circle-bold-duotone" 
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
                binary
              />
              <label for="is_required" class="text-txt font-medium">Required</label>
            </div>
            <div class="flex items-center gap-8">
              <Checkbox 
                id="is_anonymous" 
                v-model="newSurvey.is_anonymous" 
                binary
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
            severity="secondary"
            @click="showDialog = false" 
          />
          <Button
            label="Save Survey"
            icon="i-solar:diskette-bold"
            severity="primary"
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

// Computed properties that ensure boolean values and handle reactivity
const isRequired = computed({
  get: () => {
    // Safely access the value with fallback
    return Boolean(newSurvey.value?.is_required ?? false);
  },
  set: (value) => {
    if (newSurvey.value) {
      newSurvey.value.is_required = Boolean(value);
    }
  }
});

const isAnonymous = computed({
  get: () => {
    // Safely access the value with fallback
    return Boolean(newSurvey.value?.is_anonymous ?? false);
  },
  set: (value) => {
    if (newSurvey.value) {
      newSurvey.value.is_anonymous = Boolean(value);
    }
  }
});

// Load existing surveys for this page
async function loadSurveys() {
  const allSurveys = await fetchAllSurveys();
  surveyOptions.value = allSurveys.filter(s => s.page_id === props.pageId || s.page_id == null);
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
  const payload = { 
    ...newSurvey.value, 
    page_id: props.pageId,
    is_required: Boolean(isRequired.value),
    is_anonymous: Boolean(isAnonymous.value)
  };
  
  const result = await createSurvey(payload);
  // Refresh list and select the new survey
  await loadSurveys();
  selectedId.value = result.id;
  emit('update:modelValue', result.id);
  
  // Reset and close dialog
  newSurvey.value = { 
    question: '', 
    type: 'radio', 
    options: [''], 
    is_required: false, 
    is_anonymous: false, 
    locale: 'en' 
  };
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
