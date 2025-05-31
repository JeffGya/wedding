<template>
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white p-6 rounded shadow-md w-full max-w-lg relative">
        <button
          @click="$emit('close')"
          class="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          aria-label="Close modal"
        >
          &times;
        </button>
        <h2 class="text-xl font-semibold mb-4">{{ isEdit ? 'Edit Guest' : 'Add Guest' }}</h2>
  
        <Form ref="guestForm" :model="form" @submit="handleSubmit" class="space-y-4">
          <div>
            <FloatLabel variant="in">
              <InputText
                id="group_label"
                v-model="form.group_label"
                type="text"
                class="w-full border px-3 py-2 rounded"
                rules="required|regex:/^[\\p{L}&']+$/u"
              />
              <label for="group_label">Group Name</label>
            </FloatLabel>
          </div>
  
          <div>
            <FloatLabel variant="in">
              <InputText
                id="name"
                v-model="form.name"
                type="text"
                class="w-full border px-3 py-2 rounded"
                rules="required|regex:/^[\\p{L}&']+$/u"
              />
              <label for="name">Name</label>
            </FloatLabel>
          </div>
  
          <div>
            <FloatLabel variant="in">
              <InputText
                id="email"
                v-model="form.email"
                type="email"
                class="w-full border px-3 py-2 rounded"
              />
              <label for="email">Email</label>
            </FloatLabel>
          </div>
          <div>
            <FloatLabel variant="in">
              <Select
                id="preferred_language"
                v-model="form.preferred_language"
                :options="[
                  { label: 'English', value: 'en' },
                  { label: 'Lithuanian', value: 'lt' }
                ]"
                optionLabel="label"
                optionValue="value"
                class="w-full border px-3 py-2 rounded"
              />
              <label for="preferred_language">Preferred Language</label>
            </FloatLabel>
          </div>
  
          <div>
            <FloatLabel variant="in">
              <InputText
                id="code"
                v-model="form.code"
                type="text"
                class="w-full border px-3 py-2 rounded"
              />
              <label for="code">Code (Auto-generated if left blank)</label>
            </FloatLabel>
          </div>
  <div class="flex items-center">
    <ToggleSwitch
      id="plusOneSwitch"
      v-model="form.can_bring_plus_one"
      onLabel="Yes"
      offLabel="No"
      class="mr-2"
    />
    <label for="plusOneSwitch" class="font-medium">Allow Plus One</label>
  </div>
  <div class="flex items-center">
    <ToggleSwitch
      id="primarySwitch"
      v-model="form.is_primary"
      onLabel="Yes"
      offLabel="No"
      class="mr-2"
    />
    <label for="primarySwitch" class="font-medium">Primary Guest</label>
  </div>
  
          <div class="flex justify-end gap-2 mt-4">
            <Button type="button" severity="secondary" @click="$emit('close')" >Cancel</Button>
            <Button type="submit">
              {{ isEdit ? 'Update' : 'Create' }}
            </Button>
          </div>
        </Form>
      </div>
    </div>
  </template>
  
  <script setup>
  import { reactive, watch, ref } from 'vue'
  const props = defineProps({
    guest: Object,
    isEdit: Boolean
  })
  const emit = defineEmits(['save', 'close'])

  const guestForm = ref(null)
  
  const form = reactive({
    group_label: '',
    name: '',
    email: '',
    code: '',
    can_bring_plus_one: false,
    is_primary: true,
    preferred_language: 'en',
  })
  
  watch(() => props.guest, (newGuest) => {
    if (newGuest) {
      form.group_label = newGuest.group_label
      form.name = newGuest.name
      form.email = newGuest.email
      form.code = newGuest.code ?? ''
      form.can_bring_plus_one = newGuest.can_bring_plus_one ?? false
      form.is_primary = newGuest.is_primary ?? true
      form.preferred_language = newGuest.preferred_language ?? 'en'
    } else {
      form.group_label = ''
      form.name = ''
      form.email = ''
      form.code = ''
      form.can_bring_plus_one = false
      form.is_primary = true
      form.preferred_language = 'en'
    }
  }, { immediate: true })
  
const handleSubmit = () => {
  if (!guestForm.value.validate()) {
    return;
  }
  const codeValue = form.code.trim() !== ''
    ? form.code.trim()
    : Math.random().toString(36).substring(2, 8).toUpperCase();
  emit('save', {
    group_label: form.group_label,
    name: form.name,
    email: form.email,
    code: codeValue,
    can_bring_plus_one: form.can_bring_plus_one,
    is_primary: form.is_primary,
    preferred_language: form.preferred_language,
  });
}
  </script>