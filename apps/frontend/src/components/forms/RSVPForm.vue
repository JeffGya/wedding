<template>
  <Form
    :key="props.guest.code"
    :validation-schema="validationSchema"
    @submit="onSubmit"
    :initial-values="initialValues"
    v-slot="{ errors, values }"
  >
    <Banner v-if="formError" :message="formError" type="error" />

    <div class="mb-4">
      <label class="font-medium">{{ t('rsvp.attendingLabel') }}</label>
      <div>
        <label>
          <Field type="radio" name="attending" :value="true" />
          {{ t('rsvp.attendingYes') }}
        </label>
        <label class="ml-4">
          <Field type="radio" name="attending" :value="false" />
          {{ t('rsvp.attendingNo') }}
        </label>
      </div>
      <ErrorMessage name="attending" class="text-red-600 text-sm" />
    </div>

    <div v-if="props.guest.can_bring_plus_one" class="mb-4">
      <label class="inline-flex items-center">
        <Field type="checkbox" name="add_plus_one" class="mr-2" />
        {{ t('rsvp.plusOneLabel') }}
      </label>
    </div>

    <div v-if="props.guest.can_bring_plus_one && !values.add_plus_one" class="mb-4">
      <label class="font-medium">{{ t('rsvp.plusOneNameLabel') }}</label>
      <Field name="plus_one_name" class="w-full border rounded px-2 py-1" />
      <ErrorMessage name="plus_one_name" class="text-red-600 text-sm" />
      <div class="mb-4">
        <label class="font-medium">{{ t('rsvp.plusOneDietaryLabel') }}</label>
        <Field name="plus_one_dietary" class="w-full border rounded px-2 py-1" />
        <ErrorMessage name="plus_one_dietary" class="text-red-600 text-sm" />
      </div>
    </div>

    <div class="mb-4">
      <label class="font-medium">{{ t('rsvp.dietaryLabel') }}</label>
      <Field name="dietary" class="w-full border rounded px-2 py-1" />
      <ErrorMessage name="dietary" class="text-red-600 text-sm" />
    </div>

    <div class="mb-4">
      <label class="font-medium">{{ t('rsvp.notesLabel') }}</label>
      <Field as="textarea" name="notes" class="w-full border rounded px-2 py-1" />
      <ErrorMessage name="notes" class="text-red-600 text-sm" />
    </div>

    <div class="flex items-center justify-end">
      <button
        type="submit"
        class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        :disabled="isDisabled"
      >
        {{ t('rsvp.submitButton') }}
      </button>
    </div>

    <CountdownTimer v-if="props.guest.rsvp_deadline" :deadline="props.guest.rsvp_deadline" @expired="onExpired" />
  </Form>
</template>

<script setup>
import { computed, ref } from 'vue';
import { Form, Field, ErrorMessage } from 'vee-validate';
import Banner from '@/components/ui/Banner.vue';
import CountdownTimer from '@/components/ui/CountdownTimer.vue';
import { useI18n } from 'vue-i18n';
import { createRsvpSchema } from '@/validation/rsvp.schema';
const { t } = useI18n();

const props = defineProps({
  guest: {
    type: Object,
    required: true
  },
  mode: {
    type: String,
    default: 'public'
  }
});

const emit = defineEmits(['submit']);

const formError = ref('');

// Build dynamic validation schema using shared Yup schema
const validationSchema = computed(() =>
  createRsvpSchema({ plusOneAllowed: props.guest.can_bring_plus_one })
);

const initialValues = computed(() => ({
  attending: Boolean(props.guest.attending),
  dietary: props.guest.dietary || '',
  notes: props.guest.notes || '',
  add_plus_one: false,
  plus_one_name: '',
  plus_one_dietary: ''
}));

// Determine if form should be disabled (deadline passed)
const isDisabled = computed(() => {
  if (!props.guest.rsvp_deadline) return false;
  return new Date(props.guest.rsvp_deadline) < new Date();
});

function onExpired() {
  formError.value = 'RSVP deadline has passed';
}

async function onSubmit(values) {
  formError.value = '';
  try {
    const payload = { code: props.guest.code, ...values };
    emit('submit', payload);
    return;
  } catch (err) {
    formError.value = err.response?.data?.message || err.message || 'Submission failed';
  }
}
</script>