<template>
  <div class="text-center mt-16">
    <h1 class="text-4xl font-bold text-gray-800 mb-4">RSVPs</h1>
    <p class="text-gray-600 mb-4">View RSVP submissions and attendance details from your guests.</p>

    <!-- Export to CSV Button at top -->
    <div class="mb-4 text-right">
      <button @click="exportToCSV" class="px-4 py-2 bg-blue-500 text-white rounded">Export to CSV</button>
    </div>

    <!-- Filters -->
    <div class="flex flex-row gap-8 center">
      <FloatLabel variant="in" class="w-full md:w-56">
        <Select
          v-model="filters.attending"
          :options="attendanceOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
          inputId="in_label"
        />
        <label for="in_label">Filter by attendance</label>
      </FloatLabel>
      <FloatLabel variant="in" class="w-full md:w-56">
        <Select
          v-model="filters.rsvp_status"
          :options="statusOptions"
          optionLabel="label"
          optionValue="value"
          class="w-full"
          inputId="in_label"
        />
        <label for="in_label">Filter by Status:</label>
      </FloatLabel>
    
    <!-- Clear Filters Button -->
      <Button severity="danger" @click="clearFilters">Clear Filters</Button>
    </div>

    <!-- Data Table -->
    <DataTable
      :value="guests"
      :paginator="true"
      :rows="guestsPerPage"
      :totalRecords="totalGuests"
      size="small"
      stripedRows
      lazy
      :sortField="sortField"
      :sortOrder="sortOrder"
      sortMode="single"
      @page="onPage"
      @sort="onSort"
      class="p-datatable-sm"
    >
      <Column field="name" header="Guest Name" sortable />
      <Column field="group_label" header="Group" sortable />
      <Column field="code" header="Code" sortable />
      <Column header="Attending">
        <template #body="slotProps">
          {{ slotProps.data.attending ? 'Yes' : 'No' }}
        </template>
      </Column>
      <Column field="dietary" header="Dietary" />
      <Column field="notes" header="Notes" />
      <Column field="updated_at" header="Submission Date" sortable />
      <Column header="Actions">
        <template #body="slotProps">
          <Button rounded severity="secondary" icon="i-solar:pen-2-bold" @click="openEditModal(slotProps.data)" />
        </template>
      </Column>
    </DataTable>

    <!-- Edit RSVP Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div class="bg-white p-6 rounded shadow-lg max-w-lg w-full relative">
        <button @click="closeEditModal" class="absolute top-2 right-2 text-gray-600 text-xl">&times;</button>
        <RSVPForm :guest="currentGuest" mode="admin" @submit="onRSVPFormSubmit" />
      </div>
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

const statusOptions = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Attending', value: 'attending' },
  { label: 'Not Attending', value: 'not_attending' },
];

const attendanceOptions = [
  { label: 'All', value: '' },
  { label: 'Attending', value: 'true' },
  { label: 'Not Attending', value: 'false' },
];

const currentPage = ref(1);
const guestsPerPage = 40;

const sortField = ref(null);
const sortOrder = ref(null);

const onSort = (event) => {
  sortField.value = event.sortField;
  sortOrder.value = event.sortOrder;
  currentPage.value = 1;
  fetchGuests();
};

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
  }

  if (filters.rsvp_status) {
    params.rsvp_status = filters.rsvp_status;
  }

  if (sortField.value) {
    params.sort_by = sortField.value;
    params.sort_order = sortOrder.value === 1 ? 'asc' : 'desc';
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

// Handler for PrimeVue DataTable pagination
const onPage = (event) => {
  currentPage.value = event.first / event.rows + 1;
  fetchGuests();
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