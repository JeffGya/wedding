<template>
  <div class="text-center mt-16">
    <h1 class="text-4xl font-bold text-gray-800 mb-4">Guest Overview</h1>
    <p class="text-gray-600 mb-8">Manage the full list of guests invited to the wedding.</p>
    <div class="mb-4">
      <button @click="openCreateModal" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2">Add Guest</button>
      <button v-if="selectedGuest" @click="openEditModal" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Edit Guest</button>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
      <div class="bg-white p-4 rounded shadow">
        <h3 class="text-gray-600 text-sm font-semibold mb-1">Total Guests</h3>
        <p class="text-2xl font-bold text-gray-800">{{ guests.length }}</p>
      </div>
      <div class="bg-white p-4 rounded shadow">
        <h3 class="text-gray-600 text-sm font-semibold mb-1">% Attending</h3>
        <p class="text-2xl font-bold text-gray-800">
          {{
            guests.length > 0
              ? Math.round(
                  (guests.filter(g => g.rsvp_status === 'yes').length / guests.length) * 100
                )
              : 0
          }}%
        </p>
      </div>
      <div class="bg-white p-4 rounded shadow">
        <h3 class="text-gray-600 text-sm font-semibold mb-1">Dietary Stats</h3>
        <p class="text-sm text-gray-700">
          {{
            guests.reduce((acc, g) => {
              if (g.diet) {
                acc[g.diet] = (acc[g.diet] || 0) + 1
              }
              return acc
            }, {})
          }}
        </p>
      </div>
      <div class="bg-white p-4 rounded shadow">
        <h3 class="text-gray-600 text-sm font-semibold mb-1">Message Delivery Stats</h3>
        <p class="text-sm text-gray-700">
          Sent: {{ deliveryStats.sent }} | Failed: {{ deliveryStats.failed }}
        </p>
      </div>
    </div>
    <div v-if="loading" class="text-gray-500">Loading guests...</div>
    <div v-else>
      <table class="min-w-full text-left border-collapse border border-gray-300 mx-auto">
        <thead>
          <tr class="bg-gray-100">
            <th class="p-2 border border-gray-300">Group</th>
            <th class="p-2 border border-gray-300">Name</th>
            <th class="p-2 border border-gray-300">Email</th>
            <th class="p-2 border border-gray-300">RSVP</th>
            <th class="p-2 border border-gray-300">Code</th>
            <th class="p-2 border border-gray-300">+1</th>
            <th class="p-2 border border-gray-300">Kids</th>
            <th class="p-2 border border-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="guest in guests" :key="guest.id" class="border-t">
            <td class="p-2 border border-gray-300">{{ guest.group_label }}</td>
            <td class="p-2 border border-gray-300">{{ guest.name }}</td>
            <td class="p-2 border border-gray-300">{{ guest.email }}</td>
            <td class="p-2 border border-gray-300">{{ guest.rsvp_status || '—' }}</td>
            <td class="p-2 border border-gray-300">{{ guest.code || '—' }}</td>
            <td class="p-2 border border-gray-300">{{ guest.plus_one ? 'Yes' : 'No' }}</td>
            <td class="p-2 border border-gray-300">{{ guest.num_kids }}</td>
            <td class="p-2 border border-gray-300">
              <button @click="() => { selectedGuest = guest; openEditModal() }" class="text-blue-600 hover:underline mr-2">Edit</button>
              <button @click="deleteGuest(guest.id)" class="text-red-600 hover:underline">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <GuestModal
    v-if="showModal"
    :guest="selectedGuest"
    :is-edit="isEdit"
    @save="saveGuest"
    @close="closeModal"
  />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import GuestModal from '@/components/GuestModal.vue'

const guests = ref([])
const loading = ref(true)
const showModal = ref(false)
const isEdit = ref(false)
const selectedGuest = ref(null)
const deliveryStats = ref({ sent: 0, failed: 0 })

const fetchGuests = async () => {
  try {
    const res = await api.get('/guests')
    guests.value = res.data
    // Fetch delivery stats for overview (placeholder: update with actual API later)
    try {
      const statRes = await api.get('/message-stats/latest-delivery')
      deliveryStats.value = {
        sent: statRes.data.sentCount,
        failed: statRes.data.failedCount
      }
    } catch (e) {
      console.error('Failed to load delivery stats', e)
    }
  } catch (err) {
    console.error('Failed to load guests:', err)
  } finally {
    loading.value = false
  }
}

const deleteGuest = async (id) => {
  if (!confirm('Are you sure you want to delete this guest?')) return
  try {
    await api.delete(`/guests/${id}`)
    guests.value = guests.value.filter(g => g.id !== id)
  } catch (err) {
    console.error('Failed to delete guest:', err)
  }
}

const openCreateModal = () => {
  selectedGuest.value = null
  isEdit.value = false
  showModal.value = true
}

const openEditModal = () => {
  isEdit.value = true
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedGuest.value = null
}

const saveGuest = async (guestData) => {
  try {
    if (isEdit.value && selectedGuest.value) {
      await api.put(`/guests/${selectedGuest.value.id}`, guestData)
      const updated = await api.get('/guests')
      guests.value = updated.data
    } else {
      await api.post('/guests', guestData)
      const updated = await api.get('/guests')
      guests.value = updated.data
    }
    closeModal()
  } catch (err) {
    console.error('Failed to save guest:', err)
  }
}

onMounted(fetchGuests)
</script>
