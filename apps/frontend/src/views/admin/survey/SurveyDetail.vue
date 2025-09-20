<template>
  <AdminPageWrapper 
    :title="isEditMode ? 'Edit Survey' : 'Create Survey'"
    description="Configure survey questions and response options"
  >
    <template #headerActions>
      <Button 
        icon="pi pi-arrow-left" 
        severity="secondary" 
        text
        @click="cancel"
        v-tooltip.top="'Back to Surveys'"
      />
    </template>

    <Banner v-if="errorMsg" :message="errorMsg" type="error" class="mb-4" />

    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-list text-acc-base"></i>
          <span>Survey Configuration</span>
        </div>
      </template>
      <template #content>
        <Tabs v-model:activeIndex="activeIndex" value="survey">
          <TabList>
            <Tab value="survey">Survey</Tab>
            <Tab value="responses">Responses</Tab>
          </TabList>
          
          <TabPanels>
            <!-- Survey Edit Tab -->
            <TabPanel value="survey">
              <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    for="question"
                    label="Question"
                    :state="fieldErrors.question ? 'error' : null"
                    :helper="fieldErrors.question"
                  >
                    <InputText 
                      id="question" 
                      v-model="survey.question" 
                      class="w-full"
                    />
                  </FormField>

                  <FormField
                    for="locale"
                    label="Locale"
                    :state="fieldErrors.locale ? 'error' : null"
                    :helper="fieldErrors.locale"
                  >
                    <Select 
                      id="locale" 
                      v-model="survey.locale" 
                      :options="locales" 
                      optionLabel="label" 
                      optionValue="value" 
                      class="w-full"
                    />
                  </FormField>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    for="page"
                    label="Page"
                    :state="fieldErrors.page_id ? 'error' : null"
                    :helper="fieldErrors.page_id"
                  >
                    <Select 
                      id="page" 
                      v-model="survey.page_id" 
                      :options="pageOptions" 
                      optionLabel="slug" 
                      optionValue="id" 
                      class="w-full"
                    />
                  </FormField>

                  <FormField
                    for="type"
                    label="Input Type"
                    :state="fieldErrors.type ? 'error' : null"
                    :helper="fieldErrors.type"
                  >
                    <Select 
                      id="type" 
                      v-model="survey.type" 
                      :options="typeOptions" 
                      optionLabel="label" 
                      optionValue="value" 
                      class="w-full"
                    />
                  </FormField>
                </div>

                <div class="flex items-center gap-6">
                  <div class="flex items-center gap-2">
                    <Checkbox id="is_required" v-model="survey.is_required" binary />
                    <label for="is_required" class="text-sm font-medium text-text">Required</label>
                  </div>
                  
                  <div class="flex items-center gap-2">
                    <Checkbox id="is_anonymous" v-model="survey.is_anonymous" binary />
                    <label for="is_anonymous" class="text-sm font-medium text-text">Anonymous</label>
                  </div>
                </div>

                <div class="space-y-4">
                  <div class="flex items-center justify-between">
                    <label class="text-sm font-medium text-text">Options</label>
                    <Button 
                      label="Add Option" 
                      icon="pi pi-plus" 
                      severity="secondary"
                      size="normal"
                      @click="addOption" 
                    />
                  </div>
                  
                  <div 
                    v-for="(opt, idx) in survey.options"
                    :key="idx"
                    class="flex items-center gap-2"
                  >
                    <InputText 
                      v-model="survey.options[idx]" 
                      placeholder="Option text" 
                      class="flex-1"
                    />
                    <Button
                      icon="i-solar:trash-bin-trash-bold-duotone"
                      severity="danger"
                      text
                      size="normal"
                      @click="removeOption(idx)"
                      v-tooltip.top="'Remove Option'"
                    />
                  </div>
                  
                  <small v-if="fieldErrors.options" class="text-red-500">{{ fieldErrors.options }}</small>
                </div>

                <div class="flex gap-2">
                  <Button
                    :label="isEditMode ? 'Update' : 'Create'"
                    icon="i-solar:diskette-bold"
                    severity="primary"
                    @click="saveSurvey"
                    :loading="saving"
                  />
                  <Button 
                    label="Cancel" 
                    icon="pi pi-times"
                    severity="secondary" 
                    text
                    @click="cancel" 
                  />
                </div>
              </div>
            </TabPanel>

            <!-- Responses Tab -->
            <TabPanel value="responses">
              <div v-if="responses.length === 0 && !respLoading" class="text-center py-8">
                <p class="text-gray-500">No responses yet for this survey.</p>
              </div>
              
              <DataTable
                v-else
                :value="responses"
                :loading="respLoading"
                dataKey="id"
                stripedRows
                paginator
                :rows="10"
                :rowsPerPageOptions="[10, 20, 50]"
                responsiveLayout="scroll"
                class="w-full"
              >
                <Column header="Guest ID" style="width: 6rem">
                  <template #body="slotProps">
                    {{ slotProps.data.guest_id || 'Anonymous' }}
                  </template>
                </Column>
                
                <Column header="Guest Name" style="width: 12rem">
                  <template #body="slotProps">
                    {{ slotProps.data.guest_name || 'Anonymous' }}
                  </template>
                </Column>
                
                <Column header="Response" style="min-width: 200px">
                  <template #body="slotProps">
                    <div class="response-display">
                      <!-- Handle different response types -->
                      <div v-if="isJsonResponse(slotProps.data.response_text)">
                        <!-- For checkbox/array responses -->
                        <div v-for="(item, index) in parseJsonResponse(slotProps.data.response_text)" :key="index" class="mb-1">
                          <Tag :value="item" severity="info" />
                        </div>
                      </div>
                      <div v-else>
                        <!-- For text/radio responses -->
                        <span class="text-sm">{{ slotProps.data.response_text || 'No response' }}</span>
                      </div>
                    </div>
                  </template>
                </Column>
                
                <Column header="Submitted" style="width: 12rem">
                  <template #body="slotProps">
                    {{ new Date(slotProps.data.created_at).toLocaleDateString() }}
                  </template>
                </Column>
              </DataTable>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </template>
    </Card>
  </AdminPageWrapper>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminPageWrapper from '@/components/AdminPageWrapper.vue';
import Banner from '@/components/ui/Banner.vue';
import { fetchSurvey, createSurvey, updateSurvey, fetchSurveyResponses } from '@/api/pages';
import { fetchPages } from '@/api/pages';

const route = useRoute();
const router = useRouter();
const surveyId = route.params.id ? Number(route.params.id) : null;
const isEditMode = computed(() => surveyId !== null);

const survey = ref({
  question: '',
  locale: 'en',
  page_id: null,
  type: 'text',
  is_required: false,
  is_anonymous: false,
  options: []
});

const responses = ref([]);
const respLoading = ref(false);
const saving = ref(false);
const errorMsg = ref('');
const activeIndex = ref(0);
const fieldErrors = ref({});

const locales = [
  { label: 'English', value: 'en' },
  { label: 'Lithuanian', value: 'lt' }
];

const typeOptions = [
  { label: 'Text', value: 'text' },
  { label: 'Radio', value: 'radio' },
  { label: 'Checkbox', value: 'checkbox' }
];

const pageOptions = ref([]);

// Helper functions for response display
const isJsonResponse = (responseText) => {
  if (!responseText) return false;
  try {
    const parsed = JSON.parse(responseText);
    return Array.isArray(parsed);
  } catch {
    return false;
  }
};

const parseJsonResponse = (responseText) => {
  try {
    return JSON.parse(responseText);
  } catch {
    return [];
  }
};

const normaliseSurveyData = (data = {}) => {
  const next = { ...data };

  next.type = next.type === 'select' ? 'radio' : (next.type || 'text');
  next.question = typeof next.question === 'string' ? next.question.trim() : '';
  next.locale = typeof next.locale === 'string' ? (next.locale.trim() || 'en') : 'en';
  next.page_id = next.page_id != null ? Number(next.page_id) : null;
  next.is_required = !!next.is_required;
  next.is_anonymous = !!next.is_anonymous;
  if (next.requires_rsvp !== undefined) {
    next.requires_rsvp = !!next.requires_rsvp;
  }
  next.options = Array.isArray(next.options)
    ? next.options.map(opt => (typeof opt === 'string' ? opt : String(opt)))
    : [];
  if (next.type === 'text') {
    next.options = [];
  }

  return next;
};

const buildSurveyPayload = () => {
  const type = survey.value.type === 'select' ? 'radio' : survey.value.type;
  const options = Array.isArray(survey.value.options)
    ? survey.value.options
        .map(opt => (typeof opt === 'string' ? opt.trim() : String(opt).trim()))
        .filter(Boolean)
    : [];

  const payload = {
    question: (survey.value.question || '').trim(),
    locale: typeof survey.value.locale === 'string' ? survey.value.locale.trim() || 'en' : 'en',
    page_id: survey.value.page_id != null ? Number(survey.value.page_id) : null,
    type,
    is_required: !!survey.value.is_required,
    is_anonymous: !!survey.value.is_anonymous,
    options: type === 'text' ? [] : options,
  };

  if (survey.value.requires_rsvp !== undefined) {
    payload.requires_rsvp = !!survey.value.requires_rsvp;
  }

  return payload;
};

const loadSurvey = async () => {
  if (isEditMode.value) {
    try {
      const surveyData = await fetchSurvey(surveyId);
      survey.value = normaliseSurveyData(surveyData);
    } catch (err) {
      console.error('Failed to load survey', err);
      errorMsg.value = 'Failed to load survey';
    }
  }
};

const loadPages = async () => {
  try {
    const pages = await fetchPages({ includeDeleted: false });
    pageOptions.value = pages;
  } catch (err) {
    console.error('Failed to load pages', err);
  }
};

const loadResponses = async () => {
  if (isEditMode.value) {
    respLoading.value = true;
    try {
      const responseData = await fetchSurveyResponses(surveyId);
      responses.value = responseData.data || responseData; // Handle both paginated and direct data
    } catch (err) {
      console.error('Failed to load responses', err);
    } finally {
      respLoading.value = false;
    }
  }
};

const addOption = () => {
  survey.value.options.push('');
};

const removeOption = (index) => {
  survey.value.options.splice(index, 1);
};

const validateForm = (payload) => {
  fieldErrors.value = {};
  const data = payload ?? buildSurveyPayload();

  if (!data.question) {
    fieldErrors.value.question = 'Question is required';
  }

  if (!data.locale) {
    fieldErrors.value.locale = 'Locale is required';
  }

  if (!data.page_id) {
    fieldErrors.value.page_id = 'Page is required';
  }

  if (!data.type) {
    fieldErrors.value.type = 'Type is required';
  }

  if (['radio', 'checkbox'].includes(data.type) && data.options.length === 0) {
    fieldErrors.value.options = 'At least one option is required for this type';
  }

  return Object.keys(fieldErrors.value).length === 0;
};

const saveSurvey = async () => {
  const payload = buildSurveyPayload();
  survey.value = normaliseSurveyData({ ...survey.value, ...payload });

  if (!validateForm(payload)) return;

  saving.value = true;
  errorMsg.value = '';
  
  try {
    if (isEditMode.value) {
      await updateSurvey(surveyId, payload);
    } else {
      await createSurvey(payload);
    }
    router.push({ name: 'admin-surveys' });
  } catch (err) {
    console.error('Failed to save survey', err);
    errorMsg.value = 'Failed to save survey';
  } finally {
    saving.value = false;
  }
};

const cancel = () => {
  router.push({ name: 'admin-surveys' });
};

onMounted(async () => {
  await loadPages();
  await loadSurvey();
  await loadResponses();
});
</script>

<style scoped>
.response-display {
  max-width: 300px;
  word-wrap: break-word;
}
</style>
