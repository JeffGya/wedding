<template>
  <Form
    :validation-schema="validationSchema"
    @submit="onSubmit"
    v-slot="{ errors }"
  >
    <ErrorBanner v-if="formError" :message="formError" type="error" />

    <div class="mb-4">
      <label class="font-medium">Will you be attending?</label>
      <div>
        <label>
          <Field type="radio" name="attending" :value="true" />
          Yes
        </label>
        <label class="ml-4">
          <Field type="radio" name="attending" :value="false" />
          No
        </label>
      </div>
      <ErrorMessage name="attending" class="text-red-600 text-sm" />
    </div>

    <div v-if="guest.can_bring_plus_one" class="mb-4">
      <label class="font-medium">Plus-one Name</label>
      <Field name="plus_one_name" class="w-full border rounded px-2 py-1" />
      <ErrorMessage name="plus_one_name" class="text-red-600 text-sm" />
    </div>

    <div class="mb-4">
      <label class="font-medium">Number of Kids</label>
      <Field type="number" name="num_kids" class="w-full border rounded px-2 py-1" />
      <ErrorMessage name="num_kids" class="text-red-600 text-sm" />
    </div>

    <div class="mb-4">
      <label class="font-medium">Dietary Requirements</label>
      <Field name="dietary" class="w-full border rounded px-2 py-1" />
      <ErrorMessage name="dietary" class="text-red-600 text-sm" />
    </div>

    <div class="mb-4">
      <label class="font-medium">Notes</label>
      <Field as="textarea" name="notes" class="w-full border rounded px-2 py-1" />
      <ErrorMessage name="notes" class="text-red-600 text-sm" />
    </div>

    <div class="mb-4">
      <label class="font-medium">Meal Preference</label>
      <Field name="meal_preference" class="w-full border rounded px-2 py-1" />
      <ErrorMessage name="meal_preference" class="text-red-600 text-sm" />
    </div>

    <div class="flex items-center justify-end">
      <button
        type="submit"
        class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        :disabled="isDisabled"
      >
        Submit
      </button>
    </div>

    <CountdownTimer v-if="guest.rsvp_deadline" :deadline="guest.rsvp_deadline" @expired="onExpired" />
  </Form>
</template>

<script setup>
import { computed, ref } from 'vue';
import { Form, Field, ErrorMessage } from 'vee-validate';
import * as yup from 'yup';
import ErrorBanner from '@/components/ui/ErrorBanner.vue';
import CountdownTimer from '@/components/ui/CountdownTimer.vue';
import { submitGuestRSVP } from '@/api/rsvp';

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

// Build dynamic validation schema
const validationSchema = computed(() => {
  const schemaShape = {
    attending: yup.boolean().required('Please select attendance.'),
    num_kids: yup
      .number()
      .integer('Number of kids must be an integer.')
      .min(0, 'Number of kids cannot be negative.')
      .required('Please enter number of kids.'),
    dietary: yup.string().nullable(),
    notes: yup.string().nullable(),
    meal_preference: yup.string().nullable()
  };
  if (props.guest.can_bring_plus_one) {
    schemaShape.plus_one_name = yup.string().nullable();
  }
  return yup.object(schemaShape);
});

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
    // include guest identifier in payload
    const payload = { code: props.guest.code, ...values };
    await submitGuestRSVP(payload);
    // refresh page on success
    window.location.reload();
  } catch (err) {
    formError.value = err.response?.data?.message || err.message || 'Submission failed';
  }
}
</script>