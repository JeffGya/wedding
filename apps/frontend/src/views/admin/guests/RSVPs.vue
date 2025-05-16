<template>
  <div class="text-center mt-16">
    <h1 class="text-4xl font-bold text-gray-800 mb-4">RSVPs</h1>
    <p class="text-gray-600 mb-4">View RSVP submissions and attendance details from your guests.</p>

    <!-- Export to CSV Button at top -->
    <div class="mb-4 text-right">
      <button @click="exportToCSV" class="px-4 py-2 bg-blue-500 text-white rounded">Export to CSV</button>
    </div>

    <!-- Filters -->
    <div class="mb-4">
      <label>Filter by attendance status:</label>
      <select v-model="filters.attending" class="px-4 py-2 border rounded">
        <option value="">All</option>
        <option value="true">Attending</option>
        <option value="false">Not Attending</option>
      </select>
    </div>

    <div class="mb-4">
      <label>Filter by Status:</label>
      <select v-model="filters.rsvp_status" class="px-4 py-2 border rounded">
        <option value="">All</option>
        <option value="pending">Pending</option>
        <option value="attending">Attending</option>
        <option value="not_attending">Not Attending</option>
      </select>
    </div>

    <!-- Clear Filters Button -->
    <div class="mb-4">
      <button @click="clearFilters" class="px-4 py-2 bg-red-500 text-white rounded">Clear Filters</button>
    </div>

    <!-- Table -->
    <table class="min-w-full table-auto">
      <thead>
        <tr>
          <th class="px-4 py-2 border">Guest Name</th>
          <th class="px-4 py-2 border">Group</th>
          <th class="px-4 py-2 border">Code</th>
          <th class="px-4 py-2 border">Attending</th>
          <th class="px-4 py-2 border">Dietary</th>
          <th class="px-4 py-2 border">Notes</th>
          <th class="px-4 py-2 border">Submission Date</th>
          <th class="px-4 py-2 border">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="guest in filteredGuests" :key="guest.id">
          <td class="px-4 py-2 border">{{ guest.name }}</td>
          <td class="px-4 py-2 border">{{ guest.group_label || '' }}</td>
          <td class="px-4 py-2 border">{{ guest.code || '' }}</td>
          <td class="px-4 py-2 border">{{ guest.attending ? 'Yes' : 'No' }}</td>
          <td class="px-4 py-2 border">{{ guest.dietary || '' }}</td>
          <td class="px-4 py-2 border">{{ guest.notes || '' }}</td>
          <td class="px-4 py-2 border">{{ guest.updated_at }}</td>
          <td class="px-4 py-2 border">
            <button @click="openEditModal(guest)" class="px-2 py-1 bg-blue-500 text-white rounded">
              Edit
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Edit RSVP Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div class="bg-white p-6 rounded shadow-lg max-w-lg w-full relative">
        <button @click="closeEditModal" class="absolute top-2 right-2 text-gray-600 text-xl">&times;</button>
        <RSVPForm :guest="currentGuest" mode="admin" @submit="onRSVPFormSubmit" />
      </div>
    </div>

    <!-- Pagination -->
    <div class="mt-4">
      <button @click="prevPage" :disabled="currentPage <= 1">Previous</button>
      <span>{{ currentPage }} / {{ totalPages }}</span>
      <button @click="nextPage" :disabled="currentPage >= totalPages">Next</button>
    </div>

  </div>
</template>

<script setup>
import RSVPForm from '@/components/forms/RSVPForm.vue';
import { ref, reactive, computed, watch, onMounted } from 'vue';
import api from '@/api';
import { submitGuestRSVP } from '@/api/rsvp';

const guests = ref([]);
const totalGuests = ref(0);
const filters = reactive({
  attending: '',
  rsvp_status: '',
});

const currentPage = ref(1);
const guestsPerPage = 40;

const parseFilterValue = (val) => {
  if (val === 'true') return true;
  if (val === 'false') return false;
  return null;
};

const fetchGuests = async () => {
  const params = {
    page: currentPage.value,
    per_page: guestsPerPage,
  };

  const attendingVal = parseFilterValue(filters.attending);
  if (attendingVal !== null) {
    params.attending = attendingVal;
    console.log("Added attending filter:", attendingVal);
  }

  if (filters.rsvp_status) {
    params.rsvp_status = filters.rsvp_status;
    console.log("Added RSVP status filter:", filters.rsvp_status);
  }

  try {
    console.log("Fetching guests with params:", params); // Log the params being sent to the API
    const response = await api.get('/guests', { params });
    console.log('Full URL:', api.defaults.baseURL + '/guests');
    console.log("API Response:", response.data); // Log the API response
    guests.value = response.data.guests || [];
    totalGuests.value = response.data.total || 0;
    console.log("Guests data updated:", guests.value); // Log updated guests data
  } catch (error) {
    console.error('Error fetching guest data:', error);
  }
};

const totalPages = computed(() => Math.max(1, Math.ceil(totalGuests.value / guestsPerPage)));

const filteredGuests = computed(() => {
  console.log('Filtered Guests:', guests.value); // Log guests data being filtered
  return guests.value;
});

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    fetchGuests(); // Refetch data with updated page number
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchGuests(); // Refetch data with updated page number
  }
};

// Reset to page 1 whenever filters change and refetch guests
watch(
  () => [filters.attending, filters.rsvp_status],
  () => {
    console.log("Filters updated:", filters);
    currentPage.value = 1;
    fetchGuests();
  }
);

// Fetch guests on initial load
onMounted(() => {
  fetchGuests();
});

const clearFilters = () => {
  filters.attending = '';
  filters.rsvp_status = '';
};

// Helper to check if a string is an ISO date
const isISODateString = (str) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str);

const exportToCSV = async () => {
  try {
    // Fetch all guests across all pages
    const response = await api.get('/guests', {
      params: { page: 1, per_page: totalGuests.value },
    });
    const allGuests = response.data.guests || [];
    if (allGuests.length === 0) return;
    // Derive columns from keys of first guest
    const columns = Object.keys(allGuests[0]);
    // Build CSV header
    const header = columns.join(',') + '\n';
    // Build CSV rows
    const rows = allGuests.map((guest) => {
      return columns
        .map((col) => {
          let val = guest[col];
          if (typeof val === 'string' && isISODateString(val)) {
            const date = new Date(val);
            val = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
              .toString()
              .padStart(2, '0')}/${date.getFullYear()}`;
          }
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        })
        .join(',');
    });
    const csvContent = header + rows.join('\n');
    // Generate filename with timestamp
    const now = new Date();
    const filename = `rsvp_list_${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now
      .getHours()
      .toString()
      .padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now
      .getSeconds()
      .toString()
      .padStart(2, '0')}.csv`;
    // Create and download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting CSV:', error);
  }
};

const showEditModal = ref(false);
const currentGuest = ref(null);

const openEditModal = (guest) => {
  currentGuest.value = { ...guest };
  showEditModal.value = true;
};

const closeEditModal = () => {
  showEditModal.value = false;
  currentGuest.value = null;
};

const onRSVPFormSubmit = async (payload) => {
  try {
    await submitGuestRSVP(payload);
    await fetchGuests();
    closeEditModal();
  } catch (error) {
    console.error('Error updating RSVP:', error);
  }
};
</script>

<style scoped>
/* Simple table styling */
table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  text-align: left;
  padding: 8px;
}

th {
  background-color: #f2f2f2;
}
</style>