<template>
  <Card class="survey">
    <template #header>
      <h3 class="px-24">{{ survey.question }}</h3>
    </template>
    <template #content>
      <div class="survey-form">
        <!-- Thank-you message -->
        <Banner
          v-if="responded"
          type="success"
          :message="$t('survey.submitSuccess')"
          class="mb-4"
        />

        <!-- Survey form -->
        <div v-else>

          <!-- Inline error banner -->
          <Banner
            v-if="error"
            type="error"
            :message="error"
            class="mb-4"
          />
          
          <form @submit.prevent="onSubmit" class="space-y-4">
            <!-- Radio -->
            <div v-if="surveyType === 'radio'">
              <div
                v-for="opt in survey.options"
                :key="opt.id"
                class="flex items-center mb-2"
              >
                <RadioButton
                  v-model="response"
                  :inputId="`opt-${opt.id}`"
                  :name="`survey-${props.survey.id}`"
                  :value="opt.label"
                />
                <label :for="`opt-${opt.id}`" class="ml-2">{{ opt.label }}</label>
              </div>
            </div>

            <!-- Checkbox -->
            <div v-else-if="surveyType === 'checkbox'">
              <div
                v-for="opt in survey.options"
                :key="opt.id"
                class="flex items-center mb-2"
              >
                <Checkbox
                  v-model="responseArray"
                  :inputId="`chk-${opt.id}`"
                  :value="opt.label"
                />
                <label :for="`chk-${opt.id}`" class="ml-2">{{ opt.label }}</label>
              </div>
            </div>

            <!-- Text -->
            <div v-else-if="surveyType === 'text'">
              <InputText
                v-model="response"
                :placeholder="survey.placeholder || ''"
                class="w-full"
              />
            </div>

            <!-- Submit -->
            <Button
              severity="secondary"
              type="submit"
              label="Submit"
              :disabled="!canSubmit"
              class="mt-3"
            />
          </form>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup>
import { ref, computed } from 'vue';
import RadioButton from 'primevue/radiobutton';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Banner from '@/components/ui/Banner.vue';
import { createSurveyResponse } from '@/api/publicSurveys';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  survey: {
    type: Object,
    required: true,
    // Expected shape: { id, question, type, options?, placeholder?, ... }
  }
});

const surveyType = props.survey.inputType || props.survey.type;

const response = ref('');
const responseArray = ref([]);
const responded = ref(false);
const error = ref('');

// Only enable submit if there's at least one selection/entry
const canSubmit = computed(() => {
  if (surveyType === 'checkbox') {
    return responseArray.value.length > 0;
  }
  return response.value.trim() !== '';
});

async function onSubmit() {
  error.value = '';
  try {
    // Build payload according to type
    const payload = {
      response:
        surveyType === 'checkbox'
          ? responseArray.value
          : response.value
    };

    // Send to backend
    const resp = await createSurveyResponse(props.survey.id, payload);
    console.log('Survey submit response:', resp);

    // Show thank-you
    responded.value = true;
  } catch (e) {
    console.error('Survey submit failed', e);
    // Extract API error message if present
    error.value = e.response?.data?.message || t('survey.submitError');
  }
}
</script>

<style scoped>
.survey{
  @apply max-w-3xl mx-auto backdrop-blur-md;
}

.survey-form {
  max-width: 100%;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.mb-3 {
  margin-bottom: 0.75rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>