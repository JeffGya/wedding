<template>
  <AdminPageWrapper 
    title="RSVPs" 
    description="View RSVP submissions and attendance details from your guests"
  >
    <template #headerActions>
      <Button 
        label="Export to CSV" 
        icon="pi pi-download" 
        severity="secondary" 
        @click="exportToCSV" 
      />
    </template>

    <!-- Filters -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-filter text-acc-base"></i>
          <span>Filters</span>
        </div>
      </template>
      <template #content>
        <div class="flex flex-col sm:flex-row gap-4 items-end">
          <div class="flex-1">
            <FloatLabel variant="in">
              <Select
                v-model="filters.attending"
                :options="attendanceOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                inputId="attendance_filter"
              />
              <label for="attendance_filter">Filter by attendance</label>
            </FloatLabel>
          </div>
          
          <div class="flex-1">
            <FloatLabel variant="in">
              <Select
                v-model="filters.rsvp_status"
                :options="statusOptions"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                inputId="status_filter"
              />
              <label for="status_filter">Filter by Status</label>
            </FloatLabel>
          </div>
          
          <Button 
            severity="danger" 
            icon="pi pi-times" 
            @click="clearFilters"
            text
          >
            Clear Filters
          </Button>
        </div>
      </template>
    </Card>

    <!-- Data Table -->
    <Card>
      <template #content>
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
          responsiveLayout="scroll"
          class="w-full"
        >
          <Column field="name" header="Guest Name" sortable />
          <Column field="group_label" header="Group" sortable />
          <Column field="code" header="Code" sortable style="width: 8rem">
            <template #body="slotProps">
              <span class="font-mono text-sm">{{ slotProps.data.code || '—' }}</span>
            </template>
          </Column>
          
          <Column header="Attending" style="width: 8rem">
            <template #body="slotProps">
              <Tag 
                :value="slotProps.data.attending ? 'Yes' : 'No'"
                :severity="slotProps.data.attending ? 'success' : 'danger'"
              />
            </template>
          </Column>
          
          <Column field="dietary" header="Dietary" />
          <Column field="notes" header="Notes" />
          <Column field="updated_at" header="Submission Date" sortable />
          
          <Column header="Actions" style="width: 8rem">
            <template #body="slotProps">
              <Button 
                icon="pi pi-pencil" 
                severity="secondary" 
                text 
                size="small"
                @click="openEditModal(slotProps.data)"
                v-tooltip.top="'Edit RSVP'"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>

    <!-- Edit RSVP Modal -->
    <Dialog 
      v-model:visible="showEditModal" 
      modal 
      header="Edit RSVP"
      :style="{ width: '50rem' }"
      :breakpoints="{ '960px': '75vw', '641px': '90vw' }"
    >
      <RSVPForm :guest="currentGuest" mode="admin" @submit="onRSVPFormSubmit" />
    </Dialog>
  </AdminPageWrapper>
</template>

<script setup>
import RSVPForm from '@/components/forms/RSVPForm.vue';
import { ref, reactive, computed, watch, onMounted } from 'vue';
import api from '@/api';
import { submitGuestRSVP } from '@/api/rsvp';
import AdminPageWrapper from '@/components/AdminPageWrapper.vue';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import FloatLabel from 'primevue/floatlabel';

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
    console.log("Fetching guests with params:", params);
    const response = await api.get('/guests', { params });
    console.log('Full URL:', api.defaults.baseURL + '/guests');
    console.log("API Response:", response.data);
    guests.value = response.data.guests || [];
    totalGuests.value = response.data.total || 0;
    console.log("Guests data updated:", guests.value);
  } catch (error) {
    console.error('Error fetching guest data:', error);
  }
};

const totalPages = computed(() => Math.max(1, Math.ceil(totalGuests.value / guestsPerPage)));

const filteredGuests = computed(() => {
  console.log('Filtered Guests:', guests.value);
  return guests.value;
});

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    fetchGuests();
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchGuests();
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