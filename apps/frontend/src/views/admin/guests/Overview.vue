<template>
  <div class="text-center mt-16">
    <h1 class="text-4xl font-bold text-gray-800 mb-4">Guest Overview</h1>
    <p class="text-gray-600 mb-8">Manage the full list of guests invited to the wedding.</p>
    <div class="mb-4">
      <button @click="openCreateModal" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2">Add Guest</button>
      <button v-if="selectedGuest" @click="openEditModal" class="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">Edit Guest</button>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-7xl mx-auto mb-8">
      <!-- RSVP Status -->
      <StatCard
        title="RSVP Status"
        chartType="doughnut"
        :items="[
          { label: 'Going', value: stats.attending },
          { label: 'Not Going', value: stats.not_attending },
          { label: 'Pending', value: stats.pending }
        ]"
      />
      <!-- Email delivery -->
      <StatCard
        title="Email Delivery"
        :items="[
          { label: 'Emails Sent', value: deliveryStats.sent },
          { label: 'Emails Failed', value: deliveryStats.failed }
        ]"
      />
      <!-- Overall Response Rate -->
      <StatCard
        title="Overall Response Rate"
        chartType="doughnut"
        :items="[
          { label: 'Replied', value: stats.attending + stats.not_attending },
          { label: 'Pending', value: stats.pending }
        ]"
      />
      <!-- No-Shows vs Late Responses -->
      <StatCard
        title="No-Shows vs Late Responses"
        chartType="doughnut"
        :items="[
          { label: 'No-Shows', value: stats.no_shows },
          { label: 'Late Responses', value: stats.late_responses }
        ]"
      />
      <!-- Average Time to RSVP -->
      <StatCard
        title="Avg. RSVP Time (days)"
        :value="stats.avg_response_time.toFixed(1)"
      />
      <!-- Dietary Requirements Breakdown -->
      <template v-if="dietaryItems.length > 1">
        <StatCard
          title="Dietary Requirements Breakdown"
          chartType="bar"
          :items="dietaryItems"
        />
      </template>
      <template v-else-if="dietaryItems.length === 1">
        <StatCard :title="dietaryItems[0].label" :value="dietaryItems[0].value" />
      </template>
      <template v-else>
        <StatCard title="Dietary Requirements" :value="0" />
      </template>
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
            <td class="p-2 border border-gray-300">
              {{
                guest.attending === true
                  ? 'Yes'
                  : guest.attending === false
                  ? 'No'
                  : 'Pending'
              }}
            </td>
            <td class="p-2 border border-gray-300">{{ guest.code || '—' }}</td>
            <td class="p-2 border border-gray-300">{{ guest.plus_one_name ? 'Yes' : 'No' }}</td>
            <td class="p-2 border border-gray-300">{{ guest.num_kids }}</td>
            <td class="p-2 border border-gray-300">
              <button @click="openEditForGuest(guest)" class="text-blue-600 hover:underline mr-2">Edit</button>
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
import { ref, onMounted, computed } from 'vue'
import api from '@/api'
import GuestModal from '@/components/GuestModal.vue'
import { fetchGuestAnalytics } from '@/api/analytics';
import StatCard from '@/components/ui/StatCard.vue';

const guests = ref([])
const loading = ref(true)
const showModal = ref(false)
const isEdit = ref(false)
const selectedGuest = ref(null)
const deliveryStats = ref({ sent: 0, failed: 0 })

const stats = ref({
  total: 0,
  attending: 0,
  not_attending: 0,
  pending: 0,
  no_shows: 0,
  late_responses: 0,
  avg_response_time: 0,
  dietary_counts: []
});

// Compute a simple items array for dietary chart
const dietaryItems = computed(() =>
  (stats.value.dietary_counts || []).map(dc => ({ label: dc.label, value: dc.count }))
)

const fetchStats = async () => {
  try {
    const res = await fetchGuestAnalytics();
    stats.value = {
      total: res.stats.total,
      attending: res.stats.attending,
      not_attending: res.stats.not_attending,
      pending: res.stats.pending,
      no_shows: res.no_shows,
      late_responses: res.late_responses,
      avg_response_time: res.avg_response_time_days,
      dietary_counts: Object.entries(res.dietary).map(([label, count]) => ({ label, count }))
    };
  } catch (e) {
    console.error('Failed to load guest analytics', e);
  }
};

const fetchGuests = async () => {
  try {
    const res = await api.get('/guests')
    guests.value = res.data.guests || []
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

function openEditForGuest(guest) {
  selectedGuest.value = guest;
  isEdit.value = true;
  showModal.value = true;
}

const closeModal = () => {
  showModal.value = false
  selectedGuest.value = null
}

const saveGuest = async (guestData) => {
  try {
    if (isEdit.value && selectedGuest.value) {
      await api.put(`/guests/${selectedGuest.value.id}`, guestData)
    } else {
      await api.post('/guests', guestData)
    }
    await fetchGuests()
    await fetchStats()
    closeModal()
  } catch (err) {
    console.error('Failed to save guest:', err)
  }
}

onMounted(async () => {
  await fetchGuests();
  await fetchStats();
})
</script>
