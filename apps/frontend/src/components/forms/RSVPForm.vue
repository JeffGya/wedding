<template>
  <Form
    class="space-y-16"
    :key="props.guest.code"
    :validation-schema="validationSchema"
    @submit="onSubmit"
    :initial-values="initialValues"
    v-slot="{ errors, values }"
  >

    <CountdownTimer v-if="props.guest.rsvp_deadline" :deadline="props.guest.rsvp_deadline" @expired="onExpired" />

    <Banner v-if="formError" :message="formError" type="error" />

    <div>
      <p
        class="mb-4"
        for="attending"
      >
        {{ t('rsvp.attendingLabel') }}
    </p>
      <div class="space-y-8 mt-4">
        <div class="flex items-center gap-4">
          <RadioButton 
          v-model="form.attending" 
          inputId="attending-yes" 
          name="attending" 
          :value="true"
          />
          <label for="attending-yes">{{ t('rsvp.attendingYes') }}</label>
        </div>
        <div class="flex items-center gap-4">
          <RadioButton 
            v-model="form.attending" 
            inputId="attending-no" 
            name="attending" 
            :value="false" 
            />
          <label for="attending-no">{{ t('rsvp.attendingNo') }}</label>
        </div>
      </div>
      <Banner v-if="errors.attending" type="error" :closable="false" class="text-sm mt-4">
        {{ errors.attending }}
      </Banner>
    </div>

    <div>
      <Field name="dietary">
        <label
          for="dietary"
        >
        {{ t('rsvp.dietaryLabel') }}
      </label>
          <InputText 
            id="dietary" 
            type="text"
            class="mt-4"
            v-model="form.dietary" 
          />
      </Field>
      <Banner v-if="errors.dietary" type="error" :closable="false" class="text-sm mt-4">
        {{ errors.dietary }}
      </Banner>
    </div>

    <div>
      <Field name="notes">
        <label 
          for="notes" 
        >
          {{ t('rsvp.notesLabel') }}
        </label>
        <Textarea
          id="notes" 
          class="mt-4"
          v-model="form.notes" 
        />
      </Field>
      <Banner v-if="errors.notes" type="error" :closable="false" class="text-sm mt-4">
        {{ errors.notes }}
      </Banner>
    </div>

    <div 
      v-if="props.guest.can_bring_plus_one"
    >
      <p class="mb-4">
        {{ t('rsvp.plusOneLabel') }}
      </p>
        <div class="flex items-center mt-4 space-x-4">
          <ToggleSwitch inputId="add-plus-one" v-model="form.add_plus_one" class="mr-2" />
        <label 
          for="add-plus-one"
        >
          {{ form.add_plus_one ? t('rsvp.yes') : t('rsvp.no') }}
        </label>
      </div>
    </div>

    <div 
      v-if="props.guest.can_bring_plus_one && form.add_plus_one"
      class="plus-one p-16 rounded-sm space-y-16"
      >
      <div class="mb-4">
        <Field name="plus_one_name">
          <label 
            for="plus_one_name"
            class="font-500"
          >
            {{ t('rsvp.plusOneNameLabel') }}
          </label>
          <InputText
            id="plus_one_name"
            class="mt-4"
            v-model="form.plus_one_name"
          />
        </Field>
      </div>
      <Banner v-if="errors.plus_one_name" type="error" :closable="false" class="text-sm mt-4">
        {{ errors.plus_one_name }}
      </Banner>
      <div class="mb-4">
        <Field name="plus_one_dietary">
          <label 
            for="plus_one_dietary" 
            class="font-500"
          >
            {{ t('rsvp.plusOneDietaryLabel') }}
          </label>
          <InputText 
            id="plus_one_dietary" 
            class="mt-4"
            v-model="form.plus_one_dietary" 
          />
        </Field>
        <Banner v-if="errors.plus_one_dietary" type="error" :closable="false" class="text-sm mt-4">
          {{ errors.plus_one_dietary }}
        </Banner>
      </div>
    </div>

      <Button
        type="submit"
        size="large"
        :disabled="isDisabled"
      >
        {{ t('rsvp.submitButton') }}
      </Button>
  </Form>
</template>

<script setup>
import { computed, ref, reactive, watch } from 'vue';
import { Form, Field } from 'vee-validate';
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

<style scoped>
.plus-one {
  background-image: var(--bg-glass);
  border: 1px solid var(--bg-glass-border);
}
</style>