<template>
  <Form
    :key="props.guest.code"
    :validation-schema="validationSchema"
    @submit="onSubmit"
    :initial-values="initialValues"
    v-slot="{ errors, values }"
  >

    <CountdownTimer v-if="props.guest.rsvp_deadline" :deadline="props.guest.rsvp_deadline" @expired="onExpired" />

    <Banner v-if="formError" :message="formError" type="error" />

    <div class="mb-4">
      <label class="font-medium">{{ t('rsvp.attendingLabel') }}</label>
      <div class="flex items-center">
        <RadioButton id="attending-yes" name="attending" :value="true" v-model="form.attending" />
        <label for="attending-yes" class="ml-2">{{ t('rsvp.attendingYes') }}</label>
        <RadioButton id="attending-no" name="attending" :value="false" v-model="form.attending" class="ml-4" />
        <label for="attending-no" class="ml-2">{{ t('rsvp.attendingNo') }}</label>
      </div>
      <Message v-if="errors.attending" severity="error" :closable="false" class="text-sm mt-1">
        {{ errors.attending }}
      </Message>
    </div>

    <div class="mb-4">
      <label class="font-medium">{{ t('rsvp.dietaryLabel') }}</label>
      <Field name="dietary">
        <InputText v-model="form.dietary" class="w-full" />
      </Field>
      <Message v-if="errors.dietary" severity="error" :closable="false" class="text-sm mt-1">
        {{ errors.dietary }}
      </Message>
    </div>

    <div class="mb-4">
      <label class="font-medium">{{ t('rsvp.notesLabel') }}</label>
      <Field name="notes">
        <Textarea v-model="form.notes" class="w-full" />
      </Field>
      <Message v-if="errors.notes" severity="error" :closable="false" class="text-sm mt-1">
        {{ errors.notes }}
      </Message>
    </div>

    <div v-if="props.guest.can_bring_plus_one" class="mb-4 flex items-center">
      <label class="font-medium mr-2">{{ t('rsvp.plusOneLabel') }}</label>
      <ToggleSwitch v-model="form.add_plus_one" class="mr-2" />
      <span class="font-semibold">{{ form.add_plus_one ? t('rsvp.yes') : t('rsvp.no') }}</span>
    </div>

    <div v-if="props.guest.can_bring_plus_one && form.add_plus_one" class="mb-4">
      <label class="font-medium">{{ t('rsvp.plusOneNameLabel') }}</label>
      <Field name="plus_one_name">
        <InputText v-model="form.plus_one_name" class="w-full" />
      </Field>
      <Message v-if="errors.plus_one_name" severity="error" :closable="false" class="text-sm mt-1">
        {{ errors.plus_one_name }}
      </Message>
      <div class="mb-4">
        <label class="font-medium">{{ t('rsvp.plusOneDietaryLabel') }}</label>
        <Field name="plus_one_dietary">
          <InputText v-model="form.plus_one_dietary" class="w-full" />
        </Field>
        <Message v-if="errors.plus_one_dietary" severity="error" :closable="false" class="text-sm mt-1">
          {{ errors.plus_one_dietary }}
        </Message>
      </div>
    </div>

      <Button
        type="submit"
        class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        :disabled="isDisabled"
      >
        {{ t('rsvp.submitButton') }}
      </Button>
  </Form>
</template>

<script setup>
import { computed, ref, reactive, watch } from 'vue';
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

const emit = defineEmits(['submit', 'update:modelValue']);

const formError = ref('');

// Build dynamic validation schema using shared Yup schema
const validationSchema = computed(() =>
  createRsvpSchema({ plusOneAllowed: props.guest.can_bring_plus_one })
);

const initialValues = computed(() => ({
  attending: Boolean(props.guest.attending),
  dietary: props.guest.dietary || '',
  notes: props.guest.notes || '',
  add_plus_one: Boolean(props.guest.plus_one_name), // auto-enable toggle if name exists
  plus_one_name: props.guest.plus_one_name || '',
  plus_one_dietary: props.guest.plus_one_dietary || ''
}));

const form = reactive({
  attending: Boolean(props.guest.attending),
  dietary: props.guest.dietary || '',
  notes: props.guest.notes || '',
  add_plus_one: Boolean(props.guest.plus_one_name),
  plus_one_name: props.guest.plus_one_name || '',
  plus_one_dietary: props.guest.plus_one_dietary || ''
});

watch(form, (newVal) => {
  emit('update:modelValue', { ...newVal });
}, { deep: true });

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

  const isRemovingPlusOne = props.guest.can_bring_plus_one && !form.add_plus_one && props.guest.plus_one_name;

  try {
    const payload = {
      code: props.guest.code,
      attending: form.attending,
      dietary: form.dietary,
      notes: form.notes,
      plus_one_name: form.add_plus_one ? form.plus_one_name : null,
      plus_one_dietary: form.add_plus_one ? form.plus_one_dietary : null
    };

    if (isRemovingPlusOne) {
      const confirmDelete = window.confirm(t('rsvp.confirmDeletePlusOne'));
      if (!confirmDelete) return;
    }

    console.log('🚀 Submitting RSVP payload:', payload);
    emit('submit', payload);
  } catch (err) {
    formError.value = err.response?.data?.message || err.message || 'Submission failed';
  }
}
</script>