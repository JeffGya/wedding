<template>
  <div>
    <h2 class="text-xl font-semibold mb-4">Select Recipients</h2>
 
    <!-- Filters -->
    <div class="mb-4 space-x-4">
      <input
        v-model="search"
        type="text"
        placeholder="Search by name"
        class="px-3 py-2 border rounded"
      />
 
      <select v-model="rsvpFilter" class="px-3 py-2 border rounded">
        <option value="all">All RSVP</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
        <option value="pending">Pending</option>
      </select>
 
      <select v-model="languageFilter" class="px-3 py-2 border rounded">
        <option value="all">All Languages</option>
        <option value="en">English</option>
        <option value="lt">Lithuanian</option>
      </select>
    </div>
 
    <!-- Guest List -->
    <div class="mb-4">
      <label class="block mb-2 font-medium">
        <input type="checkbox" :checked="allSelected" @change="toggleAll" class="mr-2" />
        Select All
      </label>
      <ul class="space-y-2">
        <li v-if="filteredGuests.length === 0" class="text-sm text-gray-500">
          No guests match your filters.
        </li>
        <li v-for="guest in filteredGuests" :key="guest.id" class="flex items-center space-x-2">
          <input
            type="checkbox"
            :value="guest.id"
            :checked="selectedGuests.includes(guest.id)"
            @change="toggleGuest(guest.id)"
          />
          <span>{{ guest.name }} ({{ guest.preferred_language }}, RSVP: {{ guest.rsvp_status }})</span>
        </li>
      </ul>
    </div>
 
    <!-- Summary -->
    <p class="text-sm text-gray-600">
      {{ selectedGuests.length }} recipient(s) selected.
    </p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import axios from 'axios'
import Fuse from 'fuse.js'

const guests = ref([])
const selectedGuests = ref([])
const search = ref('')
const rsvpFilter = ref('all')
const languageFilter = ref('all')
let fuse = null

// Fetch all guests once
onMounted(async () => {
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_BASE}/guests`, {
      withCredentials: true
    })

    if (Array.isArray(res.data)) {
      guests.value = res.data
    } else if (Array.isArray(res.data.guests)) {
      guests.value = res.data.guests
    } else {
      guests.value = []
    }

    fuse = new Fuse(guests.value, { keys: ['name'], threshold: 0.4 })

    await nextTick()
  } catch (err) {
  }
})

// Filters
const filteredGuests = computed(() => {
  let matchedGuests = guests.value

  if (search.value.trim() && fuse) {
    matchedGuests = fuse.search(search.value.trim()).map(result => result.item)
  }

  return matchedGuests.filter((guest) => {
    const matchesRSVP =
      rsvpFilter.value === 'all' ||
      (rsvpFilter.value === 'yes' && guest.rsvp_status === 'yes') ||
      (rsvpFilter.value === 'no' && guest.rsvp_status === 'no') ||
      (rsvpFilter.value === 'pending' && !guest.rsvp_status)

    const matchesLanguage =
      languageFilter.value === 'all' || guest.preferred_language === languageFilter.value

    return matchesRSVP && matchesLanguage
  })
})

const toggleGuest = (id) => {
  if (selectedGuests.value.includes(id)) {
    selectedGuests.value = selectedGuests.value.filter(g => g !== id)
  } else {
    selectedGuests.value.push(id)
  }
}

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

defineExpose({
  selectedGuests,
  getSelectedGuestIds: () => selectedGuests.value,
  setSelectedGuestIds
})
</script>

<style scoped>
/* Optional styles */
</style>
