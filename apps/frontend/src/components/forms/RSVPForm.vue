<template>
  <Form
    ref="formRef"
    :model="form"
    class="space-y-16"
    :key="props.guest.code"
    @submit="onSubmit"
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
            rules="required"
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
            rules="required"
          />
          <label for="attending-no" class="text-txt font-medium">{{ $t('rsvp.attendingNo') }}</label>
        </div>
      </div>
      <Banner v-if="fieldErrors.attending" :message="fieldErrors.attending" type="error" :closable="false" class="text-sm" />
    </div>

    <Transition name="fade">
      <div v-if="form.attending" class="space-y-8">
        <label for="dietary" class="text-txt font-medium block mb-8">
          {{ $t('rsvp.dietaryLabel') }}
        </label>
        <InputText 
          id="dietary" 
          v-model="form.dietary"
          type="text"
          class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
          :rules="dietaryRules"
        />
        <Banner v-if="fieldErrors.dietary" :message="fieldErrors.dietary" type="error" :closable="false" class="text-sm" />
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="form.attending" class="space-y-8">
        <label for="notes" class="text-txt font-medium block mb-8">
          {{ $t('rsvp.notesLabel') }}
        </label>
        <Textarea
          id="notes" 
          v-model="form.notes"
          class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus min-h-48"
          :rules="notesRules"
        />
        <Banner v-if="fieldErrors.notes" :message="fieldErrors.notes" type="error" :closable="false" class="text-sm" />
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
          <label for="plus_one_name" class="text-txt font-medium block mb-8">
            {{ $t('rsvp.plusOneNameLabel') }}
          </label>
          <InputText
            id="plus_one_name"
            v-model="form.plus_one_name"
            class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
            :rules="plusOneNameRules"
          />
          <Banner v-if="fieldErrors.plus_one_name" :message="fieldErrors.plus_one_name" type="error" :closable="false" class="text-sm" />
        </div>
        
        <div class="space-y-8">
          <label for="plus_one_dietary" class="text-txt font-medium block mb-8">
            {{ $t('rsvp.plusOneDietaryLabel') }}
          </label>
          <InputText 
            id="plus_one_dietary" 
            v-model="form.plus_one_dietary"
            class="w-full bg-form-bg border border-form-border rounded-md transition-colors duration-200 focus:bg-form-bg-focus focus:border-form-border-focus"
            :rules="plusOneDietaryRules"
          />
          <Banner v-if="fieldErrors.plus_one_dietary" :message="fieldErrors.plus_one_dietary" type="error" :closable="false" class="text-sm" />
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
import Banner from '@/components/ui/Banner.vue';
import CountdownTimer from '@/components/ui/CountdownTimer.vue';
import { useI18n } from 'vue-i18n';

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
const formRef = ref(null);
const fieldErrors = ref({});

// Check if this is a returning guest (has already submitted an RSVP)
const isReturningGuest = computed(() => props.guest.attending !== null && props.guest.attending !== undefined);

// Initialize form with guest data if returning guest
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

// Validation rules for PrimeVue Form
// Pattern matches: no code injection characters (<>[]{}%^=*|\~`)
const safeStringPattern = /^[^<>[\]{}$%^=*|\\~`]+$/;
const safeStringRule = `regex:${safeStringPattern.source}`;

const dietaryRules = computed(() => {
  return form.dietary ? safeStringRule : '';
});

const notesRules = computed(() => {
  if (!form.notes) return '';
  return `max:500|${safeStringRule}`;
});

const plusOneNameRules = computed(() => {
  if (!props.guest.can_bring_plus_one || !form.add_plus_one) return '';
  return form.plus_one_name ? safeStringRule : '';
});

const plusOneDietaryRules = computed(() => {
  if (!props.guest.can_bring_plus_one || !form.add_plus_one) return '';
  return form.plus_one_dietary ? safeStringRule : '';
});

// Watch form changes and emit to parent if needed
watch(form, (newVal) => {
  emit('update:modelValue', { ...newVal });
}, { deep: true });

// Re-initialize form when guest prop changes
watch(() => props.guest.code, () => {
  const isReturning = props.guest.attending !== null && props.guest.attending !== undefined;
  form.attending = isReturning ? Boolean(props.guest.attending) : null;
  form.dietary = isReturning ? (props.guest.dietary || '') : '';
  form.notes = isReturning ? (props.guest.notes || '') : '';
  form.add_plus_one = isReturning && props.guest.can_bring_plus_one ? Boolean(props.guest.plus_one_name) : false;
  form.plus_one_name = isReturning && props.guest.can_bring_plus_one ? (props.guest.plus_one_name || '') : '';
  form.plus_one_dietary = isReturning && props.guest.can_bring_plus_one ? (props.guest.plus_one_dietary || '') : '';
  form.send_email = false;
});

// Determine if form should be disabled (deadline passed)
const isDisabled = computed(() => {
  if (!props.guest.rsvp_deadline) return false;
  return new Date(props.guest.rsvp_deadline) < new Date();
});

function onExpired() {
  formError.value = 'RSVP deadline has passed';
}

async function onSubmit() {
  formError.value = '';
  fieldErrors.value = {};
  
  // Validate form using PrimeVue Form's validate method
  if (formRef.value && typeof formRef.value.validate === 'function') {
    const valid = await formRef.value.validate();
    if (!valid) {
      // Get validation errors from form
      const errors = formRef.value.errors || {};
      fieldErrors.value = errors;
      return;
    }
  }
  
  // Manual validation for required fields
  if (form.attending === null || form.attending === undefined) {
    fieldErrors.value.attending = t('rsvp.attendingRequired');
    return;
  }
  
  // Validate dietary restrictions if provided
  if (form.dietary && !/^[^<>[\]{}$%^=*|\\~`]+$/.test(form.dietary)) {
    fieldErrors.value.dietary = t('rsvp.noCodeChars');
    return;
  }
  
  // Validate notes if provided
  if (form.notes) {
    if (form.notes.length > 500) {
      fieldErrors.value.notes = t('rsvp.notesMax');
      return;
    }
    if (!/^[^<>[\]{}$%^=*|\\~`]+$/.test(form.notes)) {
      fieldErrors.value.notes = t('rsvp.noCodeChars');
      return;
    }
  }
  
  // Validate plus one fields if enabled
  if (props.guest.can_bring_plus_one && form.add_plus_one) {
    if (form.plus_one_name && !/^[^<>[\]{}$%^=*|\\~`]+$/.test(form.plus_one_name)) {
      fieldErrors.value.plus_one_name = t('rsvp.noCodeChars');
      return;
    }
    if (form.plus_one_dietary && !/^[^<>[\]{}$%^=*|\\~`]+$/.test(form.plus_one_dietary)) {
      fieldErrors.value.plus_one_dietary = t('rsvp.noCodeChars');
      return;
    }
  }
  
  const isRemovingPlusOne = props.guest.can_bring_plus_one && !form.add_plus_one && props.guest.plus_one_name;
  
  // Only include plus one data if guest is allowed to bring a plus one
  const canIncludePlusOne = props.guest.can_bring_plus_one && form.add_plus_one;
  
  try {
    const payload = {
      code: props.guest.code,
      attending: form.attending,
      dietary: form.dietary || null,
      notes: form.notes || null,
      plus_one_name: canIncludePlusOne ? (form.plus_one_name || null) : null,
      plus_one_dietary: canIncludePlusOne ? (form.plus_one_dietary || null) : null
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