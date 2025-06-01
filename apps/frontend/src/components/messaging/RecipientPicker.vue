<template>
  <div>
    <!-- Filters -->
    <div class="mb-4 space-x-4">
      <FloatLabel variant="in">
        <InputText
          id="search"
          v-model="search"
          type="text"
        />
        <label for="search">Search by name</label>
      </FloatLabel>
 
      <FloatLabel variant="in">
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
        />
        <label for="rsvpFilter">RSVP Status</label>
      </FloatLabel>
 
      <FloatLabel variant="in">
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
        />
        <label for="languageFilter">Language</label>
      </FloatLabel>
    </div>


 
    <!-- Guest List -->
    <div class="mb-4">
      <div class="mb-4 flex items-center">
        <ToggleSwitch
          id="allSelected"
          :inputId="'allSelected'"
          :checked="allSelected"
          @change="toggleAll"
          class="mr-2"
        />
        <label> Select All </label>
      </div>
          <!-- Summary -->
      <p class="text-sm">
        {{ selectedGuests.length }} recipient(s) selected.
      </p>
      <div v-if="filteredGuests.length === 0" class="text-sm">
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import api from '@/api'
import Fuse from 'fuse.js'
import Listbox from 'primevue/listbox';

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
    });

    guests.value = Array.isArray(res.data.guests) ? res.data.guests : [];

    fuse = new Fuse(guests.value, { keys: ['name'], threshold: 0.4 });

    await nextTick();
  } catch (err) {
    console.error("Failed to fetch guests:", err);
  }
};

onMounted(() => {
  fetchGuests();
});

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

const toggleGuest = (id) => {
  if (selectedGuests.value.includes(id)) {
    selectedGuests.value = selectedGuests.value.filter(g => g !== id);
  } else {
    selectedGuests.value.push(id);
  }
  console.log('Selected guests:', selectedGuests.value); // Logs the array correctly
};

const toggleAll = () => {
  if (allSelected.value) {
    selectedGuests.value = []
  } else {
    selectedGuests.value = filteredGuests.value.map(g => g.id)
  }
}

const allSelected = computed(() => {
  return filteredGuests.value.length > 0 &&
         filteredGuests.value.every(g => selectedGuests.value.includes(g.id))
})

const setSelectedGuestIds = (ids) => {
  selectedGuests.value = Array.isArray(ids) ? ids : []
}

// Example of sending selected recipients to backend
const sendMessage = async () => {
  try {
    // Send the actual selected guest IDs (spread into array)
    await api.post(`/messages`, {
      recipients: [...selectedGuests.value]
    })
  } catch (error) {
    console.error('Error sending message:', error)
  }
}

defineExpose({
  selectedGuests,
  getSelectedGuestIds: () => selectedGuests.value,
  setSelectedGuestIds,
  sendMessage
})
</script>

<style scoped>
/* Optional styles */
</style>
