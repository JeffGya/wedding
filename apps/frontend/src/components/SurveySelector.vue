

<template>
  <div class="survey-selector">
    <!-- Existing surveys dropdown -->
    <div class="p-field p-grid p-ai-center p-mb-2">
      <label class="p-col-fixed" style="width: 6rem;">Survey</label>
      <div class="p-col">
        <Dropdown
          v-model="selectedId"
          :options="surveyOptions"
          optionLabel="question"
          optionValue="id"
          placeholder="Select survey..."
          :filter="true"
          filterPlaceholder="Search..."
          @change="onSelect"
        />
      </div>
      <div class="p-col-fixed">
        <Button label="New Survey" icon="pi pi-plus" @click="showDialog = true" />
      </div>
    </div>

    <!-- Dialog to create new survey inline -->
    <Dialog header="Create Survey" v-model:visible="showDialog" modal :closable="false">
      <div class="p-fluid">
        <div class="p-field">
          <label for="question">Question</label>
          <InputText id="question" v-model="newSurvey.question" />
        </div>
        <div class="p-field">
          <label for="type">Type</label>
          <Dropdown
            id="type"
            v-model="newSurvey.type"
            :options="typeOptions"
            optionLabel="label"
            optionValue="value"
          />
        </div>
        <div class="p-field">
          <label>Options</label>
          <div
            v-for="(opt, idx) in newSurvey.options"
            :key="idx"
            class="p-inputgroup p-mb-2"
          >
            <InputText v-model="newSurvey.options[idx]" placeholder="Option text" />
            <Button icon="pi pi-trash" class="p-button-danger" @click="removeOption(idx)" />
          </div>
          <Button label="Add Option" icon="pi pi-plus" class="p-mt-2" @click="addOption" />
        </div>
        <div class="p-field p-formgrid p-grid">
          <div class="p-field-checkbox p-col-6">
            <Checkbox id="is_required" v-model="newSurvey.is_required" />
            <label for="is_required">Required</label>
          </div>
          <div class="p-field-checkbox p-col-6">
            <Checkbox id="is_anonymous" v-model="newSurvey.is_anonymous" />
            <label for="is_anonymous">Anonymous</label>
          </div>
        </div>
      </div>
      <template #footer>
        <Button label="Cancel" class="p-button-text" @click="showDialog = false" />
        <Button
          label="Save"
          icon="pi pi-save"
          severity="primary"
          @click="createNewSurvey"
          :disabled="!canCreate"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Checkbox from 'primevue/checkbox';
import { fetchSurveys, createSurvey } from '@/api/pages';

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
  surveyOptions.value = await fetchSurveys(props.pageId);
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
.survey-selector .p-inputgroup {
  align-items: center;
}
</style>