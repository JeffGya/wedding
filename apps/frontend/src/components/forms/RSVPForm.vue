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

    <div class="space-y-8">
      <p class="text-txt font-medium">
        {{ $t('rsvp.attendingLabel') }}
      </p>
      <div class="space-y-8">
        <div class="flex items-center gap-16">
          <RadioButton 
            v-model="form.attending" 
            inputId="attending-yes" 
            name="attending" 
            :value="true"
            class="text-btn-primary-base"
          />
          <label for="attending-yes" class="text-txt font-medium">{{ $t('rsvp.attendingYes') }}</label>
        </div>
        <div class="flex items-center gap-16">
          <RadioButton 
            v-model="form.attending" 
            inputId="attending-no" 
            name="attending" 
            :value="false" 
            class="text-btn-primary-base"
          />
          <label for="attending-no" class="text-txt font-medium">{{ $t('rsvp.attendingNo') }}</label>
        </div>
      </div>
      <Banner v-if="errors.attending" type="error" :closable="false" class="text-sm">
        {{ errors.attending }}
      </Banner>
    </div>

    <Transition name="fade">
      <div v-if="form.attending" class="space-y-8">
        <Field name="dietary">
          <label for="dietary" class="text-txt font-medium block mb-8">
            {{ $t('rsvp.dietaryLabel') }}
          </label>
          <InputText 
            id="dietary" 
            type="text"
            class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
            v-model="form.dietary" 
          />
        </Field>
        <Banner v-if="errors.dietary" type="error" :closable="false" class="text-sm">
          {{ errors.dietary }}
        </Banner>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="form.attending" class="space-y-8">
        <Field name="notes">
          <label for="notes" class="text-txt font-medium block mb-8">
            {{ $t('rsvp.notesLabel') }}
          </label>
          <Textarea
            id="notes" 
            class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus min-h-48"
            v-model="form.notes" 
          />
        </Field>
        <Banner v-if="errors.notes" type="error" :closable="false" class="text-sm">
          {{ errors.notes }}
        </Banner>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="form.attending && props.guest.can_bring_plus_one" class="space-y-8">
        <p class="text-txt font-medium">
          {{ $t('rsvp.plusOneLabel') }}
        </p>
        <div class="flex items-center gap-16">
          <ToggleSwitch 
            inputId="add-plus-one" 
            v-model="form.add_plus_one" 
            class="text-btn-primary-base"
          />
          <label for="add-plus-one" class="text-txt font-medium">
            {{ form.add_plus_one ? $t('rsvp.yes') : $t('rsvp.no') }}
          </label>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div 
        v-if="form.attending && props.guest.can_bring_plus_one && form.add_plus_one"
        class="plus-one p-16 rounded-md space-y-16 border border-bg-glass-border"
      >
        <div class="space-y-8">
          <Field name="plus_one_name">
            <label for="plus_one_name" class="text-txt font-medium block mb-8">
              {{ $t('rsvp.plusOneNameLabel') }}
            </label>
            <InputText
              id="plus_one_name"
              class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
              v-model="form.plus_one_name"
            />
          </Field>
          <Banner v-if="errors.plus_one_name" type="error" :closable="false" class="text-sm">
            {{ errors.plus_one_name }}
          </Banner>
        </div>
        
        <div class="space-y-8">
          <Field name="plus_one_dietary">
            <label for="plus_one_dietary" class="text-txt font-medium block mb-8">
              {{ $t('rsvp.plusOneDietaryLabel') }}
            </label>
            <InputText 
              id="plus_one_dietary" 
              class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
              v-model="form.plus_one_dietary" 
            />
          </Field>
          <Banner v-if="errors.plus_one_dietary" type="error" :closable="false" class="text-sm">
            {{ errors.plus_one_dietary }}
          </Banner>
        </div>
      </div>
    </Transition>

    <Button
      type="submit"
      size="large"
      :disabled="isDisabled"
      class="w-full bg-btn-primary-base hover:bg-btn-primary-hover active:bg-btn-primary-active text-btn-primary-text font-semibold rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {{ $t('rsvp.submitButton') }}
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

// Check if this is a returning guest (has already submitted an RSVP)
const isReturningGuest = computed(() => props.guest.attending !== null && props.guest.attending !== undefined);

const initialValues = computed(() => {
  // Only pre-select values for returning guests
  if (isReturningGuest.value) {
    return {
      attending: Boolean(props.guest.attending),
      dietary: props.guest.dietary || '',
      notes: props.guest.notes || '',
      add_plus_one: Boolean(props.guest.plus_one_name), // auto-enable toggle if name exists
      plus_one_name: props.guest.plus_one_name || '',
      plus_one_dietary: props.guest.plus_one_dietary || ''
    };
  }
  // New guests: no pre-selection
  return {
    attending: null,
    dietary: '',
    notes: '',
    add_plus_one: false,
    plus_one_name: '',
    plus_one_dietary: ''
  };
});

const form = reactive({
  attending: isReturningGuest.value ? Boolean(props.guest.attending) : null,
  dietary: isReturningGuest.value ? (props.guest.dietary || '') : '',
  notes: isReturningGuest.value ? (props.guest.notes || '') : '',
  add_plus_one: isReturningGuest.value ? Boolean(props.guest.plus_one_name) : false,
  plus_one_name: isReturningGuest.value ? (props.guest.plus_one_name || '') : '',
  plus_one_dietary: isReturningGuest.value ? (props.guest.plus_one_dietary || '') : ''
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

/* Fade and collapse animation for form fields */
.fade-enter-active {
  transition: opacity 300ms ease-in, max-height 300ms ease-in, margin-top 300ms ease-in, margin-bottom 300ms ease-in, padding-top 300ms ease-in, padding-bottom 300ms ease-in;
  overflow: hidden;
}

.fade-leave-active {
  transition: opacity 300ms ease-out, max-height 300ms ease-out, margin-top 300ms ease-out, margin-bottom 300ms ease-out, padding-top 300ms ease-out, padding-bottom 300ms ease-out;
  overflow: hidden;
}

.fade-enter-from {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.fade-enter-to {
  opacity: 1;
  max-height: 2000px;
}

.fade-leave-from {
  opacity: 1;
  max-height: 2000px;
}

.fade-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  margin-bottom: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .space-y-16 {
    gap: 1rem;
  }
  
  .space-y-8 {
    gap: 0.5rem;
  }
  
  .p-16 {
    padding: 1rem;
  }
  
  .gap-16 {
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .plus-one {
    padding: 0.75rem;
  }
}
</style>