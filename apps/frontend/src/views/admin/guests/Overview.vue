<template>
  <AdminPageWrapper 
    title="Guest Overview" 
    description="Manage the full list of guests invited to the wedding"
  >
    <template #headerActions>
      <Button 
        label="Add Guest" 
        icon="pi pi-user-plus" 
        severity="primary" 
        @click="openCreateModal" 
      />
    </template>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
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
      
      <!-- Response Rate -->
      <StatCard
        title="Response Rate"
        :value="`${responseRatePercentage}%`"
      />
      
      <!-- Dietary Requirements -->
      <StatCard
        v-if="dietaryItems.length > 0"
        title="Dietary Requirements"
        chartType="bar"
        :items="dietaryItems"
      />
      <StatCard
        v-else
        title="Dietary Requirements"
        :value="0"
      />
      
      <!-- Plus One Invitations -->
      <StatCard
        title="Plus One Invitations"
        chartType="bar-horizontal"
        :items="plusOneItems"
      />
    </div>

    <!-- Guests Table -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-users text-acc-base"></i>
          <span>Guest List</span>
        </div>
      </template>
      <template #content>
        <div v-if="loading" class="flex justify-center p-8">
          <i class="pi pi-spin pi-spinner text-2xl text-acc-base"></i>
        </div>
        <div v-else>
          <DataTable
            :value="sortedGuests"
            :sortField="sortKey"
            :sortOrder="sortAsc ? 1 : -1"
            stripedRows
            paginator 
            :rows="20"
            :rowsPerPageOptions="[10, 20, 50, 100]"
            @sort="onSort"
            responsiveLayout="scroll"
            class="w-full"
          >
            <Column header="#" style="width: 3rem">
              <template #body="slotProps">{{ slotProps.index + 1 }}</template>
            </Column>
            
            <Column field="is_primary" header="Primary" sortable style="width: 6rem">
              <template #body="slotProps">
                <Tag 
                  :value="slotProps.data.is_primary ? 'Yes' : 'No'"
                  :severity="slotProps.data.is_primary ? 'success' : 'secondary'"
                />
              </template>
            </Column>
            
            <Column field="group_label" header="Group" sortable />
            <Column field="name" header="Name" sortable />
            <Column field="email" header="Email" sortable />
            <Column field="preferred_language" header="Language" sortable />
            
            <Column header="RSVP" sortField="attending" sortable style="width: 8rem">
              <template #body="slotProps">
                <Tag 
                  :value="getRSVPStatus(slotProps.data.attending)"
                  :severity="getRSVPSeverity(slotProps.data.attending)"
                />
              </template>
            </Column>
            
            <Column header="Code" field="code" sortable style="width: 8rem">
              <template #body="slotProps">
                <span class="font-mono text-sm">{{ slotProps.data.code || '—' }}</span>
              </template>
            </Column>
            
            <Column field="can_bring_plus_one" header="Can Bring +1" sortable style="width: 8rem">
              <template #body="slotProps">
                <span v-if="slotProps.data.is_primary">
                  <Tag 
                    :value="slotProps.data.can_bring_plus_one ? 'Yes' : 'No'"
                    :severity="slotProps.data.can_bring_plus_one ? 'success' : 'warning'"
                  />
                </span>
                <span v-else class="text-muted">—</span>
              </template>
            </Column>
            
            <Column header="Actions" style="width: 10rem">
              <template #body="slotProps">
                <div class="flex gap-2">
                  <Button
                    icon="pi pi-pencil"
                    severity="secondary"
                    text
                    size="small"
                    @click="openEditForGuest(slotProps.data)"
                    v-tooltip.top="'Edit Guest'"
                  />
                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    size="small"
                    @click="deleteGuest(slotProps.data.id)"
                    v-tooltip.top="'Delete Guest'"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
      </template>
    </Card>
  </AdminPageWrapper>

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
import AdminPageWrapper from '@/components/AdminPageWrapper.vue';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

const guests = ref([])
const loading = ref(true)
const showModal = ref(false)
const isEdit = ref(false)
const selectedGuest = ref(null)
const deliveryStats = ref({ sent: 0, failed: 0 })

const sortKey = ref('');
const sortAsc = ref(true);

const getRSVPStatus = (attending) => {
  if (attending === true || attending === 1) return 'Yes';
  if (attending === false || attending === 0) return 'No';
  return 'Pending';
};

const getRSVPSeverity = (attending) => {
  if (attending === true || attending === 1) return 'success';
  if (attending === false || attending === 0) return 'danger';
  return 'warning';
};

const sortedGuests = computed(() => {
  const list = [...guests.value];
  if (sortKey.value) {
    list.sort((a, b) => {
      let va = a[sortKey.value];
      let vb = b[sortKey.value];
      if (typeof va === 'boolean') va = va ? 1 : 0;
      if (typeof vb === 'boolean') vb = vb ? 1 : 0;
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
  dietary_counts: []
});

// Calculate response rate percentage
const responseRatePercentage = computed(() => {
  if (stats.value.total === 0) return 0;
  const responded = stats.value.attending + stats.value.not_attending;
  return Math.round((responded / stats.value.total) * 100);
});

// Format dietary items for chart display
const dietaryItems = computed(() => {
  return stats.value.dietary_counts
    .filter(item => item.count > 0) // Only show dietary requirements that have guests
    .map(item => ({
      label: item.label,
      value: item.count
    }))
    .sort((a, b) => b.value - a.value); // Sort by count descending
});

// Calculate plus one statistics
const plusOneItems = computed(() => {
  // Get all primary guests
  const primaryGuests = guests.value.filter(g => g.is_primary);
  
  // Count primary guests who can bring plus ones
  const canBringPlusOne = primaryGuests.filter(g => g.can_bring_plus_one).length;
  
  // Count primary guests who actually have plus ones (have a non-primary guest in same group)
  const groupIdsWithPlusOnes = new Set();
  guests.value.forEach(guest => {
    if (!guest.is_primary) {
      groupIdsWithPlusOnes.add(guest.group_id);
    }
  });
  
  const havePlusOne = primaryGuests.filter(g => 
    g.can_bring_plus_one && groupIdsWithPlusOnes.has(g.group_id)
  ).length;
  
  // Count primary guests who can bring plus ones but don't have any
  const noPlusOne = canBringPlusOne - havePlusOne;
  
  return [
    { label: 'Can Bring +1', value: canBringPlusOne },
    { label: 'Have +1', value: havePlusOne },
    { label: 'No +1', value: noPlusOne }
  ];
});

const horizontalBarOptions = computed(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: 'var(--form-border)', drawBorder: false },
      ticks: { color: 'var(--form-placeholder-text)' }
    },
    y: {
      grid: { color: 'var(--form-border)', drawBorder: false },
      ticks: { color: 'var(--form-placeholder-text)' }
    }
  }
}));

const fetchStats = async () => {
  try {
    const res = await fetchGuestAnalytics();
    stats.value = {
      total: res.stats.total,
      attending: res.stats.attending,
      not_attending: res.stats.not_attending,
      pending: res.stats.pending,
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
    await fetchStats()
  } catch (err) {
    console.error('Failed to delete guest:', err)
  }
}

const openCreateModal = () => {
  selectedGuest.value = null
  isEdit.value = false
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
