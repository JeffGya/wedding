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

    <Field name="attending" v-slot="{ field, handleChange, value }">
      <div class="space-y-8">
        <p class="text-txt font-medium">
          {{ $t('rsvp.attendingLabel') }}
        </p>
        <div class="space-y-8">
          <div class="flex items-center gap-16">
            <RadioButton 
              :modelValue="value"
              @update:modelValue="(val) => { 
                handleChange(val);
                form.attending = val;
              }"
              inputId="attending-yes" 
              name="attending" 
              :value="true"
              class="text-btn-primary-base"
            />
            <label for="attending-yes" class="text-txt font-medium">{{ $t('rsvp.attendingYes') }}</label>
          </div>
          <div class="flex items-center gap-16">
            <RadioButton 
              :modelValue="value"
              @update:modelValue="(val) => { 
                handleChange(val);
                form.attending = val;
              }"
              inputId="attending-no" 
              name="attending" 
              :value="false" 
              class="text-btn-primary-base"
            />
            <label for="attending-no" class="text-txt font-medium">{{ $t('rsvp.attendingNo') }}</label>
          </div>
        </div>
        <Banner v-if="errors.attending" :message="errors.attending" type="error" :closable="false" class="text-sm" />
      </div>
    </Field>

    <Transition name="fade">
      <div v-if="form.attending" class="space-y-8">
        <Field name="dietary" v-slot="{ field, handleChange, value }">
          <label for="dietary" class="text-txt font-medium block mb-8">
            {{ $t('rsvp.dietaryLabel') }}
          </label>
          <InputText 
            id="dietary" 
            type="text"
            class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
            :modelValue="value"
            @update:modelValue="(val) => { 
              handleChange(val);
              form.dietary = val;
            }"
          />
        </Field>
        <Banner v-if="errors.dietary" :message="errors.dietary" type="error" :closable="false" class="text-sm" />
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="form.attending" class="space-y-8">
        <Field name="notes" v-slot="{ field, handleChange, value }">
          <label for="notes" class="text-txt font-medium block mb-8">
            {{ $t('rsvp.notesLabel') }}
          </label>
          <Textarea
            id="notes" 
            class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus min-h-48"
            :modelValue="value"
            @update:modelValue="(val) => { 
              handleChange(val);
              form.notes = val;
            }"
          />
        </Field>
        <Banner v-if="errors.notes" :message="errors.notes" type="error" :closable="false" class="text-sm" />
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="form.attending && props.guest.can_bring_plus_one" class="space-y-8">
        <Field name="add_plus_one" v-slot="{ field, handleChange, value }">
          <p class="text-txt font-medium">
            {{ $t('rsvp.plusOneLabel') }}
          </p>
          <div class="flex items-center gap-16">
            <ToggleSwitch 
              inputId="add-plus-one" 
              :modelValue="value"
              @update:modelValue="(val) => { 
                handleChange(val);
                form.add_plus_one = val;
              }"
              class="text-btn-primary-base"
            />
            <label for="add-plus-one" class="text-txt font-medium">
              {{ value ? $t('rsvp.yes') : $t('rsvp.no') }}
            </label>
          </div>
        </Field>
      </div>
    </Transition>

    <Transition name="fade">
      <div 
        v-if="form.attending && props.guest.can_bring_plus_one && form.add_plus_one"
        class="plus-one p-16 rounded-md space-y-16 border border-bg-glass-border"
      >
        <div class="space-y-8">
          <Field name="plus_one_name" v-slot="{ field, handleChange, value }">
            <label for="plus_one_name" class="text-txt font-medium block mb-8">
              {{ $t('rsvp.plusOneNameLabel') }}
            </label>
            <InputText
              id="plus_one_name"
              class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
              :modelValue="value"
              @update:modelValue="(val) => { 
                handleChange(val);
                form.plus_one_name = val;
              }"
            />
          </Field>
          <Banner v-if="errors.plus_one_name" :message="errors.plus_one_name" type="error" :closable="false" class="text-sm" />
        </div>
        
        <div class="space-y-8">
          <Field name="plus_one_dietary" v-slot="{ field, handleChange, value }">
            <label for="plus_one_dietary" class="text-txt font-medium block mb-8">
              {{ $t('rsvp.plusOneDietaryLabel') }}
            </label>
            <InputText 
              id="plus_one_dietary" 
              class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
              :modelValue="value"
              @update:modelValue="(val) => { 
                handleChange(val);
                form.plus_one_dietary = val;
              }"
            />
          </Field>
          <Banner v-if="errors.plus_one_dietary" :message="errors.plus_one_dietary" type="error" :closable="false" class="text-sm" />
        </div>
      </div>
    </Transition>

    <!-- Admin-only: Send confirmation email toggle -->
    <Transition name="fade">
      <div v-if="props.mode === 'admin'" class="space-y-8">
        <div class="flex items-center gap-16">
          <ToggleSwitch 
            inputId="send-email" 
            v-model="form.send_email" 
            class="text-btn-primary-base"
          />
          <label for="send-email" class="text-txt font-medium">
            {{ $t('rsvp.sendConfirmationEmail', 'Send confirmation email') }}
          </label>
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
import { Form, Field, useField } from 'vee-validate';
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
  // Only pre-populate plus one fields if guest is allowed to bring a plus one
  add_plus_one: isReturningGuest.value && props.guest.can_bring_plus_one ? Boolean(props.guest.plus_one_name) : false,
  plus_one_name: isReturningGuest.value && props.guest.can_bring_plus_one ? (props.guest.plus_one_name || '') : '',
  plus_one_dietary: isReturningGuest.value && props.guest.can_bring_plus_one ? (props.guest.plus_one_dietary || '') : '',
  // Admin-only: send email toggle (defaults to false)
  send_email: false
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
  
  // Use validated values from vee-validate, fallback to form object for fields not in values
  const attendingValue = values.attending !== undefined ? values.attending : form.attending;
  const dietaryValue = values.dietary !== undefined ? values.dietary : form.dietary;
  const notesValue = values.notes !== undefined ? values.notes : form.notes;
  const plusOneNameValue = values.plus_one_name !== undefined ? values.plus_one_name : form.plus_one_name;
  const plusOneDietaryValue = values.plus_one_dietary !== undefined ? values.plus_one_dietary : form.plus_one_dietary;
  const addPlusOneValue = values.add_plus_one !== undefined ? values.add_plus_one : form.add_plus_one;
  
  const isRemovingPlusOne = props.guest.can_bring_plus_one && !addPlusOneValue && props.guest.plus_one_name;
  
  // Only include plus one data if guest is allowed to bring a plus one
  const canIncludePlusOne = props.guest.can_bring_plus_one && addPlusOneValue;
  
  try {
    const payload = {
      code: props.guest.code,
      attending: attendingValue,
      dietary: dietaryValue || null,
      notes: notesValue || null,
      plus_one_name: canIncludePlusOne ? plusOneNameValue : null,
      plus_one_dietary: canIncludePlusOne ? plusOneDietaryValue : null
    };
    
    // Only include send_email in admin mode
    if (props.mode === 'admin') {
      payload.send_email = form.send_email || false;
    }
    
    if (isRemovingPlusOne) {
      const confirmDelete = window.confirm(t('rsvp.confirmDeletePlusOne'));
      if (!confirmDelete) {
        return;
      }
    }
    
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