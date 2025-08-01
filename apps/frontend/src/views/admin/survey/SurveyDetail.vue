<template>
  <div>
    <Button
      icon="pi pi-arrow-left"
      label="Back"
      @click="cancel"
    />
    <h1>
      {{ isEditMode ? 'Edit Survey' : 'Create Survey' }}
    </h1>
    <Card>
      <template #content>
        <Banner v-if="errorMsg" :message="errorMsg" type="error" />
        <Tabs 
          v-model:activeIndex="activeIndex"
          value="survey"
        >
      <TabList>
        <Tab value="survey">Survey</Tab>
        <Tab value="responses">Responses</Tab>
      </TabList>
      <TabPanels>
        <!-- Survey Edit Tab -->
        <TabPanel
          value="survey"
        >
          <div>
            <div>
              <label for="question">Question</label>
              <InputText id="question" v-model="survey.question" :class="{ 'p-invalid': fieldErrors.question }" />
            </div>
            <div>
              <label for="locale">Locale</label>
              <Select id="locale" v-model="survey.locale" :options="locales" optionLabel="label" optionValue="value" :class="{ 'p-invalid': fieldErrors.locale }" />
            </div>
            <div>
              <label for="page">Page</label>
              <Select id="page" v-model="survey.page_id" :options="pageOptions" optionLabel="slug" optionValue="id" :class="{ 'p-invalid': fieldErrors.page_id }" />
            </div>
            <div>
              <label for="type">Input Type</label>
              <Select id="type" v-model="survey.type" :options="typeOptions" optionLabel="label" optionValue="value" :class="{ 'p-invalid': fieldErrors.type }" />
            </div>
            <div>
              <label for="is_required">Required</label>
              <Checkbox id="is_required" v-model="survey.is_required" binary />
            </div>
            <div>
              <label for="is_anonymous">Anonymous</label>
              <Checkbox id="is_anonymous" v-model="survey.is_anonymous" binary />
            </div>
          </div>
          <div :class="{ 'p-invalid': fieldErrors.options }">
            <label>Options</label>
            <div
              v-for="(opt, idx) in survey.options"
              :key="idx"
            >
              <div>
                <InputText v-model="survey.options[idx]" placeholder="Option text" />
              </div>
              <div>
                <Button
                  icon="pi pi-trash"
                  class="p-button-text p-button-danger"
                  @click="removeOption(idx)"
                />
              </div>
            </div>
            <Button label="Add Option" icon="pi pi-plus" @click="addOption" />
          </div>
          <div>
            <Button
              :label="isEditMode ? 'Update' : 'Create'"
              severity="primary"
              @click="saveSurvey"
              :loading="saving"
            />
            <Button label="Cancel" class="p-button-text" @click="cancel" />
          </div>
        </TabPanel>
        <!-- Responses Tab -->
        <TabPanel
         value="responses"
         >
          <DataTable
            :value="responses"
            :loading="respLoading"
            dataKey="id"
            stripedRows
            paginator
            :rows="10"
          >
            <Column field="guest_id" header="Guest ID" style="width: 6rem" />
            <Column field="response_text" header="Response" />
            <Column header="Created At" style="width: 12rem">
              <template #body="slotProps">
                {{ new Date(slotProps.data.created_at).toLocaleString() }}
              </template>
            </Column>
          </DataTable>
        </TabPanel>
      </TabPanels>
    </Tabs>
      </template>
    </Card>
    
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Banner from '@/components/ui/Banner.vue';
import {
  createSurvey,
  updateSurvey,
  fetchSurvey,
  fetchAllSurveys,
  fetchSurveyResponses,
  fetchPages,
} from '@/api/pages';

function parseOptions(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { }
  }
  return [];
}

function toBool(v) {
  return v === true || v === 'true' || v === 1 || v === '1';
}

const route = useRoute();
const router = useRouter();

const surveyId = route.params.id ? Number(route.params.id) : null;
const isEditMode = computed(() => surveyId !== null);

const survey = ref({
  question: '',
  type: 'radio',
  options: ['Option A', 'Option B'],
  is_required: false,
  is_anonymous: false,
  locale: 'en',
  page_id: null
});
const responses = ref([]);
const saving = ref(false);
const respLoading = ref(false);

const errorMsg = ref('');
const fieldErrors = reactive({
  question: false,
  locale: false,
  page_id: false,
  type: false,
  options: false
});

const locales = [
  { label: 'English', value: 'en' },
  { label: 'Lithuanian', value: 'lt' }
];
const typeOptions = [
  { label: 'Radio', value: 'radio' },
  { label: 'Checkbox', value: 'checkbox' },
  { label: 'Text', value: 'text' }
];
const pageOptions = ref([]);

const activeIndex = ref(0);

onMounted(async () => {
  // If creating a new translation, prefill from query params
  if (!isEditMode.value) {
    const qLocale = route.query.locale;
    const qPage = route.query.page;
    if (qLocale) survey.value.locale = qLocale;
    if (qPage) survey.value.page_id = Number(qPage);
  }
  // Load pages for assignment
  // fetchPages returns an array of page objects directly
  pageOptions.value = await fetchPages({ includeDeleted: false });

  if (isEditMode.value) {
    // Fetch existing survey details and prefill form fields
    const data = await fetchSurvey(surveyId);
    survey.value = {
      question: data.question || '',
      type: data.type || 'radio',
      // parse options array or JSON string
      options: parseOptions(data.options),
      // ensure booleans
      is_required: toBool(data.is_required),
      is_anonymous: toBool(data.is_anonymous),
      locale: data.locale || 'en',
      page_id: data.page_id ?? null
    };

    // Load responses
    respLoading.value = true;
    responses.value = await fetchSurveyResponses(surveyId);
    respLoading.value = false;
  }
});

// When locale changes in edit mode, switch to the matching survey record (or creation)
watch(
  () => survey.value.locale,
  async (newLocale, oldLocale) => {
    if (!isEditMode.value || newLocale === oldLocale) return;
    const pageId = survey.value.page_id;
    if (!pageId) return;
    // Find existing survey translation
    const allSurveys = await fetchAllSurveys({ includeDeleted: false });
    const match = allSurveys.find(s => s.page_id === pageId && s.locale === newLocale);
    if (match) {
      // edit existing translation
      router.push({ name: 'admin-survey-detail', params: { id: match.id } });
    } else {
      // create new translation
      router.push({ name: 'admin-survey-create', query: { page: String(pageId), locale: newLocale } });
    }
  }
);

function addOption() {
  survey.value.options.push('');
}
function removeOption(idx) {
  survey.value.options.splice(idx, 1);
}

async function saveSurvey() {
  // Clear previous errors
  errorMsg.value = '';
  Object.keys(fieldErrors).forEach(key => fieldErrors[key] = false);
  // Validate fields
  const errors = [];
  if (!survey.value.question.trim()) {
    errors.push('Question is required');
    fieldErrors.question = true;
  }
  if (!survey.value.locale) {
    errors.push('Locale must be selected');
    fieldErrors.locale = true;
  }
  if (!survey.value.page_id) {
    errors.push('Page must be selected');
    fieldErrors.page_id = true;
  }
  if (!survey.value.type) {
    errors.push('Input type is required');
    fieldErrors.type = true;
  }
  if (['radio','checkbox'].includes(survey.value.type) && survey.value.options.length === 0) {
    errors.push('At least one option is required');
    fieldErrors.options = true;
  }
  if (survey.value.type === 'text' && survey.value.options.length > 0) {
    errors.push('Options must be empty for text surveys');
    fieldErrors.options = true;
  }
  if (errors.length) {
    errorMsg.value = errors.join('; ');
    return;
  }
  saving.value = true;
  try {
    if (isEditMode.value) {
      await updateSurvey(surveyId, survey.value);
    } else {
      await createSurvey(survey.value);
    }
    router.push({ name: 'admin-surveys' });
  } catch (err) {
    console.error('Error saving survey', err);
    errorMsg.value = 'Failed to save survey: ' + (err.response?.data?.message || err.message);
  } finally {
    saving.value = false;
  }
}

function cancel() {
  router.push({ name: 'admin-surveys' });
}
</script>

<style scoped>
/* Add any survey-detail-specific styles here */
</style>