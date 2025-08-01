<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading">
      <p>Loading survey...</p>
    </div>

    <!-- Thank-you message after submit -->
    <div v-else-if="responded">
      <p>Thank you for your response!</p>
    </div>

    <!-- Error loading or submitting -->
    <div v-else>
      <h3>{{ survey.question }}</h3>

      <form @submit.prevent="onSubmit">
        <!-- Radio options -->
        <div v-if="survey.type === 'radio'">
          <RadioButton
            v-for="opt in survey.options"
            :key="opt"
            v-model="response"
            :inputId="`opt-${opt}`"
            :value="opt"
          />
          <label
            v-for="opt in survey.options"
            :key="opt"
            :for="`opt-${opt}`"
          >{{ opt }}</label>
        </div>

        <!-- Checkbox options -->
        <div v-else-if="survey.type === 'checkbox'">
          <Checkbox
            v-for="opt in survey.options"
            :key="opt"
            v-model="responseArray"
            :inputId="`chk-${opt}`"
            :value="opt"
          />
          <label
            v-for="opt in survey.options"
            :key="opt"
            :for="`chk-${opt}`"
          >{{ opt }}</label>
        </div>

        <!-- Text input -->
        <div v-else-if="survey.type === 'text'">
          <InputText
            v-model="response"
            :placeholder="survey.placeholder || ''"
          />
        </div>

        <!-- Validation or submission error -->
        <div v-if="error" class="p-text-danger">
          {{ error }}
        </div>

        <Button
          type="submit"
          label="Submit"
          :disabled="!canSubmit"
        />
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import RadioButton from 'primevue/radiobutton';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { fetchPublicSurveyById, createSurveyResponse } from '@/api/publicSurveys';

const props = defineProps({
  surveyId: { type: Number, required: true }
});

const survey = ref({ question: '', type: 'radio', options: [], placeholder: '' });
const response = ref('');
const responseArray = ref([]);
const loading = ref(true);
const responded = ref(false);
const error = ref('');

const canSubmit = computed(() => {
  if (survey.value.type === 'checkbox') {
    return responseArray.value.length > 0;
  }
  return response.value !== '';
});

onMounted(async () => {
  loading.value = true;
  try {
    const data = await fetchPublicSurveyById(props.surveyId);
    survey.value = {
      question: data.question || '',
      type: data.type,
      options: Array.isArray(data.options) ? data.options : [],
      placeholder: data.placeholder || ''
    };
    // If the API returns an 'alreadyResponded' flag, use it
    responded.value = data.alreadyResponded || false;
  } catch (e) {
    console.error('Failed to load survey', e);
    error.value = 'Unable to load survey.';
  } finally {
    loading.value = false;
  }
});

async function onSubmit() {
  error.value = '';
  try {
    const payload = { response_text: survey.value.type === 'checkbox' ? responseArray.value : response.value };
    await createSurveyResponse(props.surveyId, payload);
    responded.value = true;
  } catch (e) {
    console.error('Survey submit failed', e);
    error.value = e.response?.data?.message || 'Submission failed. Please try again.';
  }
}
</script>