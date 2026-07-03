<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Left: filters + candidate list -->
    <div>
      <!-- Filters -->
      <div class="mb-4 space-y-4">
        <FloatLabel variant="in">
          <InputText
            id="search"
            v-model="search"
            type="text"
            class="w-full"
          />
          <label for="search">Search by name</label>
        </FloatLabel>

        <div class="flex gap-4">
          <FloatLabel variant="in" class="flex-1">
            <Select
              id="rsvpFilter"
              v-model="rsvpFilter"
              :options="[
                { label: 'All RSVP', value: 'all' },
                { label: 'Attending', value: 'attending' },
                { label: 'Not Attending', value: 'not_attending' },
                { label: 'Pending', value: 'pending' }
              ]"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
            <label for="rsvpFilter">RSVP Status</label>
          </FloatLabel>

          <FloatLabel variant="in" class="flex-1">
            <Select
              id="languageFilter"
              v-model="languageFilter"
              :options="[
                { label: 'All Languages', value: 'all' },
                { label: 'English', value: 'en' },
                { label: 'Lithuanian', value: 'lt' }
              ]"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
            <label for="languageFilter">Language</label>
          </FloatLabel>
        </div>
      </div>

      <!-- Guest List -->
      <div class="mb-4 flex items-center">
        <ToggleSwitch
          id="allSelected"
          :inputId="'allSelected'"
          :checked="allSelected"
          @change="toggleAll"
          class="mr-2"
        />
        <label for="allSelected">Select all {{ filteredGuests.length }} shown</label>
      </div>

      <div v-if="filteredGuests.length === 0" class="text-sm text-[#7A6B55]">
        No guests match your filters.
      </div>
      <Listbox
        v-else
        v-model="selectedGuests"
        :options="filteredGuests"
        optionLabel="name"
        optionValue="id"
        multiple
        checkmark
        class="w-full"
      >
        <template #option="{ option }">
          <div class="flex items-center space-x-2">
            <div>
              <div class="font-semibold">{{ option.name }}</div>
              <div class="text-sm text-form-placeholder-text">
                Language: {{ option.preferred_language || 'N/A' }} &middot; RSVP: {{ option.rsvp_status || 'N/A' }}
              </div>
            </div>
          </div>
        </template>
      </Listbox>
    </div>

    <!-- Right: persistent selection, independent of the active filter -->
    <div class="bg-form-bg border border-form-border rounded-lg p-16 self-start">
      <div class="flex items-center justify-between mb-4">
        <span class="font-bold text-txt">Selected — {{ selectedGuests.length }}</span>
        <Button
          v-if="selectedGuests.length > 0"
          label="Clear all"
          severity="secondary"
          text
          size="small"
          @click="clearSelection"
        />
      </div>

      <p v-if="selectedGuests.length === 0" class="text-sm text-[#7A6B55]">
        No recipients selected yet. Everyone you select stays listed here, even
        when you change the filters on the left.
      </p>

      <ul v-else class="space-y-2 max-h-96 overflow-y-auto">
        <li
          v-for="guest in selectedGuestObjects"
          :key="guest.id"
          class="flex items-center justify-between gap-2 text-sm text-txt"
        >
          <span>{{ guest.name }}</span>
          <Button
            icon="pi pi-times"
            severity="secondary"
            text
            rounded
            size="small"
            @click="removeSelected(guest.id)"
            :aria-label="`Remove ${guest.name} from recipients`"
          />
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import api from '@/api'
import Fuse from 'fuse.js'
import Listbox from 'primevue/listbox'

const guests = ref([])
const selectedGuests = ref([])
const search = ref('')
const rsvpFilter = ref('all')
const languageFilter = ref('all')
let fuse = null

const fetchGuests = async () => {
  try {
    const res = await api.get(`/guests`, {
      withCredentials: true
    })

    guests.value = Array.isArray(res.data.guests) ? res.data.guests : []

    fuse = new Fuse(guests.value, { keys: ['name'], threshold: 0.4 })

    await nextTick()
  } catch (err) {
    console.error("Failed to fetch guests:", err)
  }
}

onMounted(() => {
  fetchGuests()
})

// Filters
const filteredGuests = computed(() => {
  // Start with all guests
  let matchedGuests = guests.value

  // Apply search if present
  if (search.value.trim() && fuse) {
    matchedGuests = fuse.search(search.value.trim()).map(result => result.item)
  }

  // Filter by primary, RSVP status, and language
  return matchedGuests.filter((guest) => {
    if (!guest.is_primary) return false

    const matchesRSVP =
      rsvpFilter.value === 'all' ||
      guest.rsvp_status === rsvpFilter.value

    const matchesLanguage =
      languageFilter.value === 'all' ||
      guest.preferred_language === languageFilter.value

    return matchesRSVP && matchesLanguage
  })
})

// The true selection as guest objects, independent of the active filter —
// this drives the persistent "Selected" panel so filtered-out selections
// never become invisible.
const selectedGuestObjects = computed(() => {
  return guests.value.filter(g => selectedGuests.value.includes(g.id))
})

const toggleGuest = (id) => {
  if (selectedGuests.value.includes(id)) {
    selectedGuests.value = selectedGuests.value.filter(g => g !== id)
  } else {
    selectedGuests.value.push(id)
  }
}

const removeSelected = (id) => {
  selectedGuests.value = selectedGuests.value.filter(g => g !== id)
}

// "Select all shown" only operates on the currently-filtered guests:
// selecting adds them to the existing selection (never replaces it), and
// deselecting removes only the shown subset (never wipes selections made
// under other filters).
const toggleAll = () => {
  const shownIds = filteredGuests.value.map(g => g.id)
  if (allSelected.value) {
    selectedGuests.value = selectedGuests.value.filter(id => !shownIds.includes(id))
  } else {
    selectedGuests.value = [...new Set([...selectedGuests.value, ...shownIds])]
  }
}

const allSelected = computed(() => {
  return filteredGuests.value.length > 0 &&
         filteredGuests.value.every(g => selectedGuests.value.includes(g.id))
})

// Exposed methods for parent components
const getSelectedRecipients = () => {
  return selectedGuests.value
}

const getSelectedGuestObjects = () => {
  return selectedGuestObjects.value
}

const setSelectedRecipients = (ids) => {
  selectedGuests.value = Array.isArray(ids) ? ids : []
}

const clearSelection = () => {
  selectedGuests.value = []
}

defineExpose({
  getSelectedRecipients,
  getSelectedGuestObjects,
  setSelectedRecipients,
  clearSelection,
  selectedGuests
})
</script>

<style scoped>
/* Optional styles */
</style>
