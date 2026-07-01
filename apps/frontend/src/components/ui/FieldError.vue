<!--
  FieldError.vue

  Reusable inline validation error text, extracted from the existing
  per-field error pattern used in SurveyDetail.vue
  (e.g. `<small v-if="fieldErrors.options" class="text-red-500">{{ fieldErrors.options }}</small>`).

  This component only renders the error TEXT. It does not add any
  margin/spacing of its own — the parent controls placement directly
  under the field.

  Companion pattern (apply in the CONSUMING component, not here):
  the input/field itself should get a red border when its corresponding
  error is non-empty, e.g.:

    <InputText
      v-model="form.name"
      :class="{ 'field-error-border': fieldErrors.name }"
    />
    <FieldError :message="fieldErrors.name" />

    .field-error-border { border-color: #B3453B; }

  Usage:
    <FieldError message="This field is required" />
    <FieldError :errors="['Too short', 'Must be unique']" />
-->
<script setup>
import { computed } from 'vue';

const props = defineProps({
  // Single error message
  message: {
    type: String,
    default: ''
  },
  // Multiple error messages (rendered one per line)
  errors: {
    type: Array,
    default: () => []
  }
});

const messages = computed(() => {
  if (props.errors && props.errors.length) {
    return props.errors.filter(Boolean);
  }
  return props.message ? [props.message] : [];
});
</script>

<template>
  <template v-if="messages.length">
    <small
      v-for="(msg, index) in messages"
      :key="index"
      class="field-error block"
    >{{ msg }}</small>
  </template>
</template>

<style scoped>
.field-error {
  font-size: 12.5px;
  color: #B3453B;
  font-family: 'Open Sans', sans-serif;
}
</style>
