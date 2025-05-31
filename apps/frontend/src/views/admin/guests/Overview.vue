<template>
  <div class="text-center">
    <h1 class="text-4xl font-bold text-gray-800 mb-8">Guest Overview</h1>
    <p class="text-gray-600 mb-16">Manage the full list of guests invited to the wedding.</p>
    <div class="mb-8">
      <Button label="Add Guest" severity="primary" class="mr-2" @click="openCreateModal" />
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 max-w-60rem mx-auto mb-16">
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
    <div v-if="loading">Loading guests...</div>
    <div v-else>
      <DataTable
        :value="sortedGuests"
        :sortField="sortKey"
        :sortOrder="sortAsc ? 1 : -1"
        :size="small"
        stripedRows
        paginator :rows="20" 
        @sort="onSort"
        class="min-w-full text-left"
        responsiveLayout="scroll"
      >
        <Column header="#">
          <template #body="slotProps">{{ slotProps.index + 1 }}</template>
        </Column>
        <Column field="is_primary" header="Primary" sortable>
          <template #body="slotProps">{{ slotProps.data.is_primary ? 'Yes' : 'No' }}</template>
        </Column>
        <Column field="group_label" header="Group" sortable />
        <Column field="name" header="Name" sortable />
        <Column field="email" header="Email" sortable />
        <Column field="preferred_language" header="Language" sortable />
        <Column header="RSVP" sortField="attending" sortable>
          <template #body="slotProps">{{ slotProps.data.attending === true ? 'Yes' : slotProps.data.attending === false ? 'No' : 'Pending' }}</template>
        </Column>
        <Column header="Code" field="code" sortable>
          <template #body="slotProps">{{ slotProps.data.code || '—' }}</template>
        </Column>
        <Column field="can_bring_plus_one" header="Can Bring +1" sortable>
          <template #body="slotProps">{{ slotProps.data.can_bring_plus_one ? 'Yes' : 'No' }}</template>
        </Column>
        <Column header="Actions">
          <template #body="slotProps">
            <div class="flex justify-center">
            <ButtonGroup>
              <Button severity="secondary" icon="i-solar:pen-new-square-bold-duotone" @click="openEditForGuest(slotProps.data)" />
              <Button severity="danger" icon="i-solar:trash-bin-minimalistic-bold-duotone" @click="deleteGuest(slotProps.data.id)" />
            </ButtonGroup>
          </div>
          </template>
        </Column>
      </DataTable>
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
import { ref as vueRef } from 'vue';
import Button from 'primevue/button';

const guests = ref([])
const loading = ref(true)
const showModal = ref(false)
const isEdit = ref(false)
const selectedGuest = ref(null)
const deliveryStats = ref({ sent: 0, failed: 0 })

const sortKey = ref('');
const sortAsc = ref(true);

const setSort = (key) => {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortKey.value = key;
    sortAsc.value = true;
  }
};

const sortedGuests = computed(() => {
  const list = [...guests.value];
  if (sortKey.value) {
    list.sort((a, b) => {
      let va = a[sortKey.value];
      let vb = b[sortKey.value];
      // Normalize booleans to numbers
      if (typeof va === 'boolean') va = va ? 1 : 0;
      if (typeof vb === 'boolean') vb = vb ? 1 : 0;
      // Normalize null/undefined
      va = va ?? '';
      vb = vb ?? '';
      let cmp = 0;
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb;
      } else {
        cmp = va.toString().localeCompare(vb.toString());
      }
      return sortAsc.value ? cmp : -cmp;
    });
  } else {
    // default grouping: by group_label, then primary, then name
    list.sort((a, b) => {
      if (a.group_label < b.group_label) return -1;
      if (a.group_label > b.group_label) return 1;
      if (a.is_primary !== b.is_primary) return (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0);
      return a.name.localeCompare(b.name);
    });
  }
  return list;
});

const onSort = (event) => {
  sortKey.value = event.sortField;
  sortAsc.value = event.sortOrder === 1;
};

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
