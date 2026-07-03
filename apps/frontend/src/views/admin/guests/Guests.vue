<template>
  <AdminPageWrapper
    title="Guests"
    description="Manage the full list of guests invited to the wedding and their RSVP status"
  >
    <template #headerActions>
      <Button
        label="Export to CSV"
        icon="pi pi-download"
        severity="secondary"
        @click="exportToCSV"
      />
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

    <!-- Error state for initial load failure -->
    <ErrorState
      v-if="loadError"
      title="Couldn't load guests"
      description="Something went wrong while loading the guest list. Please try again."
      @retry="retryLoad"
    />

    <template v-else>
      <!-- Filters -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-filter text-acc-base"></i>
            <span>Filters</span>
          </div>
        </template>
        <template #content>
          <div class="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <SelectButton
              v-model="rsvpFilter"
              :options="rsvpFilterOptions"
              optionLabel="label"
              optionValue="value"
              :allowEmpty="false"
            />

            <div class="sm:w-72">
              <FloatLabel variant="in">
                <InputText
                  id="guest_search"
                  v-model="searchQuery"
                  class="w-full"
                />
                <label for="guest_search">Search by name</label>
              </FloatLabel>
            </div>
          </div>
        </template>
      </Card>

      <!-- Guests Table -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-users text-acc-base"></i>
            <span>Guest List</span>
          </div>
        </template>
        <template #content>
          <LoadingState v-if="loading" label="Loading guests…" />

          <EmptyState
            v-else-if="sortedGuests.length === 0"
            title="No guests match these filters"
            description="Try a different search term or clear the RSVP filter to see everyone."
            action-label="Clear filters"
            @action="clearFilters"
          />

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
              <Column field="name" header="Name" sortable>
                <template #body="slotProps">
                  <div class="flex items-center gap-2">
                    <span>{{ slotProps.data.name }}</span>
                    <Tag
                      v-if="!slotProps.data.is_primary"
                      value="+1"
                      severity="info"
                      class="text-xs"
                    />
                  </div>
                </template>
              </Column>
              <Column field="email" header="Email" sortable />
              <Column field="preferred_language" header="Language" sortable />

              <Column header="RSVP" sortField="attending" sortable style="width: 8rem">
                <template #body="slotProps">
                  <Tag
                    :value="getRSVPStatusLabel(slotProps.data.attending)"
                    :severity="getRSVPSeverity(slotProps.data.attending)"
                  />
                </template>
              </Column>

              <Column field="dietary" header="Dietary" />
              <Column field="notes" header="Notes" />
              <Column field="updated_at" header="Submission Date" sortable />

              <Column header="Plus One" sortable style="width: 8rem">
                <template #body="slotProps">
                  <span v-if="slotProps.data.is_primary">
                    <Tag
                      :value="hasPlusOne(slotProps.data) ? 'Yes' : 'No'"
                      :severity="hasPlusOne(slotProps.data) ? 'success' : 'secondary'"
                    />
                  </span>
                  <span v-else class="text-muted">—</span>
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

              <Column header="Actions" style="width: 12rem">
                <template #body="slotProps">
                  <ButtonGroup>
                    <Button
                      icon="i-solar:pen-bold-duotone"
                      severity="contrast"
                      size="normal"
                      @click="openEditForGuest(slotProps.data)"
                      v-tooltip.top="'Edit Guest'"
                      :aria-label="`Edit guest ${slotProps.data.name}`"
                    />
                    <Button
                      icon="i-solar:check-circle-bold-duotone"
                      severity="contrast"
                      size="normal"
                      @click="openEditRSVP(slotProps.data)"
                      v-tooltip.top="'Edit RSVP'"
                      :aria-label="`Edit RSVP for ${slotProps.data.name}`"
                    />
                    <Button
                      icon="i-solar:trash-bin-trash-bold-duotone"
                      severity="danger"
                      size="normal"
                      @click="confirmDeleteGuest(slotProps.data)"
                      v-tooltip.top="'Delete Guest'"
                      :aria-label="`Delete guest ${slotProps.data.name}`"
                    />
                  </ButtonGroup>
                </template>
              </Column>
            </DataTable>
          </div>
        </template>
      </Card>
    </template>
  </AdminPageWrapper>

  <GuestModal
    v-if="showModal"
    :guest="selectedGuest"
    :is-edit="isEdit"
    @save="saveGuest"
    @close="closeModal"
  />

  <!-- Edit RSVP Modal -->
  <Dialog
    v-model:visible="showEditRSVPModal"
    modal
    header="Edit RSVP"
    :style="{ width: '50rem' }"
    :breakpoints="{ '960px': '75vw', '641px': '90vw' }"
  >
    <RSVPForm :guest="currentRSVPGuest" mode="admin" @submit="onRSVPFormSubmit" />
  </Dialog>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/api'
import GuestModal from '@/components/GuestModal.vue'
import RSVPForm from '@/components/forms/RSVPForm.vue'
import { submitGuestRSVP } from '@/api/rsvp'
import { fetchGuestAnalytics } from '@/api/analytics'
import StatCard from '@/components/ui/StatCard.vue'
import AdminPageWrapper from '@/components/AdminPageWrapper.vue'
import LoadingState from '@/components/ui/LoadingState.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorState from '@/components/ui/ErrorState.vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import ButtonGroup from 'primevue/buttongroup'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'
import SelectButton from 'primevue/selectbutton'
import InputText from 'primevue/inputtext'
import FloatLabel from 'primevue/floatlabel'
import { getRSVPStatusLabel, getRSVPSeverity, convertAttendingToRsvpStatus } from '@/utils/rsvpStatus'
import { useLoading } from '@/composables/useLoading'
import { useErrorHandler } from '@/composables/useErrorHandler'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useToastService } from '@/utils/toastService'

const guests = ref([])
const { loading } = useLoading()
const { handleError } = useErrorHandler({ showToast: true })
const { confirmDialog } = useConfirmDialog()
const { showSuccess } = useToastService()

const showModal = ref(false)
const isEdit = ref(false)
const selectedGuest = ref(null)
const deliveryStats = ref({ sent: 0, failed: 0 })
const loadError = ref(false)

const sortKey = ref('')
const sortAsc = ref(true)

// RSVP filter chips (All / Attending / Not attending / Pending)
const rsvpFilterOptions = [
  { label: 'All', value: '' },
  { label: 'Attending', value: 'attending' },
  { label: 'Not attending', value: 'not_attending' },
  { label: 'Pending', value: 'pending' }
]
const rsvpFilter = ref('')

// Name search
const searchQuery = ref('')

const clearFilters = () => {
  rsvpFilter.value = ''
  searchQuery.value = ''
}

const filteredGuests = computed(() => {
  return guests.value.filter((g) => {
    const matchesRsvp =
      rsvpFilter.value === '' || convertAttendingToRsvpStatus(g.attending) === rsvpFilter.value
    const matchesSearch =
      searchQuery.value.trim() === '' ||
      g.name?.toLowerCase().includes(searchQuery.value.trim().toLowerCase())
    return matchesRsvp && matchesSearch
  })
})

const sortedGuests = computed(() => {
  const list = [...filteredGuests.value]
  if (sortKey.value) {
    list.sort((a, b) => {
      let va = a[sortKey.value]
      let vb = b[sortKey.value]
      if (typeof va === 'boolean') va = va ? 1 : 0
      if (typeof vb === 'boolean') vb = vb ? 1 : 0
      va = va ?? ''
      vb = vb ?? ''
      let cmp = 0
      if (typeof va === 'number' && typeof vb === 'number') {
        cmp = va - vb
      } else {
        cmp = va.toString().localeCompare(vb.toString())
      }
      return sortAsc.value ? cmp : -cmp
    })
  } else {
    list.sort((a, b) => {
      if (a.group_label < b.group_label) return -1
      if (a.group_label > b.group_label) return 1
      if (a.is_primary !== b.is_primary) return (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0)
      return a.name.localeCompare(b.name)
    })
  }
  return list
})

const onSort = (event) => {
  sortKey.value = event.sortField
  sortAsc.value = event.sortOrder === 1
}

const stats = ref({
  total: 0,
  attending: 0,
  not_attending: 0,
  pending: 0,
  dietary_counts: []
})

// Calculate response rate percentage
const responseRatePercentage = computed(() => {
  if (stats.value.total === 0) return 0
  const responded = stats.value.attending + stats.value.not_attending
  return Math.round((responded / stats.value.total) * 100)
})

// Format dietary items for chart display
const dietaryItems = computed(() => {
  return stats.value.dietary_counts
    .filter((item) => item.count > 0) // Only show dietary requirements that have guests
    .map((item) => ({
      label: item.label,
      value: item.count
    }))
    .sort((a, b) => b.value - a.value) // Sort by count descending
})

// Calculate plus one statistics
const plusOneItems = computed(() => {
  // Get all primary guests
  const primaryGuests = guests.value.filter((g) => g.is_primary)

  // Count primary guests who can bring plus ones
  const canBringPlusOne = primaryGuests.filter((g) => g.can_bring_plus_one).length

  // Count primary guests who actually have plus ones (have a non-primary guest in same group)
  const groupIdsWithPlusOnes = new Set()
  guests.value.forEach((guest) => {
    if (!guest.is_primary) {
      groupIdsWithPlusOnes.add(guest.group_id)
    }
  })

  const havePlusOne = primaryGuests.filter(
    (g) => g.can_bring_plus_one && groupIdsWithPlusOnes.has(g.group_id)
  ).length

  // Count primary guests who can bring plus ones but don't have any
  const noPlusOne = canBringPlusOne - havePlusOne

  return [
    { label: 'Can Bring +1', value: canBringPlusOne },
    { label: 'Have +1', value: havePlusOne },
    { label: 'No +1', value: noPlusOne }
  ]
})

// Check if a primary guest has a plus-one
const hasPlusOne = (guest) => {
  if (!guest.is_primary) return false
  return guests.value.some((g) => !g.is_primary && g.group_id === guest.group_id)
}

const fetchStats = async () => {
  try {
    const res = await fetchGuestAnalytics()
    stats.value = {
      total: res.stats.total,
      attending: res.stats.attending,
      not_attending: res.stats.not_attending,
      pending: res.stats.pending,
      dietary_counts: Object.entries(res.dietary).map(([label, count]) => ({ label, count }))
    }
  } catch (e) {
    handleError(e, 'Failed to load guest analytics')
  }
}

const fetchGuests = async () => {
  loading.value = true
  try {
    const res = await api.get('/guests')
    guests.value = res.data.guests || []
    loadError.value = false
    try {
      const statRes = await api.get('/message-stats/latest-delivery')
      deliveryStats.value = {
        sent: statRes.data.sentCount,
        failed: statRes.data.failedCount
      }
    } catch (e) {
      // Silently fail for delivery stats - not critical
    }
  } catch (err) {
    loadError.value = true
    handleError(err, 'Failed to load guests')
  } finally {
    loading.value = false
  }
}

const retryLoad = async () => {
  loadError.value = false
  await fetchGuests()
  await fetchStats()
}

const deleteGuest = async (id) => {
  try {
    await api.delete(`/guests/${id}`)
    guests.value = guests.value.filter((g) => g.id !== id)
    await fetchStats()
  } catch (err) {
    handleError(err, 'Failed to delete guest')
  }
}

const confirmDeleteGuest = (guest) => {
  confirmDialog({
    header: 'Delete guest',
    message: `Are you sure you want to delete ${guest.name}? This cannot be undone.`,
    acceptLabel: 'Delete guest',
    onAccept: () => deleteGuest(guest.id)
  })
}

const openCreateModal = () => {
  selectedGuest.value = null
  isEdit.value = false
  showModal.value = true
}

function openEditForGuest(guest) {
  selectedGuest.value = guest
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
    } else {
      await api.post('/guests', guestData)
    }
    await fetchGuests()
    await fetchStats()
    closeModal()
  } catch (err) {
    handleError(err, 'Failed to save guest')
  }
}

// Edit RSVP flow
const showEditRSVPModal = ref(false)
const currentRSVPGuest = ref(null)

const openEditRSVP = (guest) => {
  currentRSVPGuest.value = { ...guest }
  showEditRSVPModal.value = true
}

const closeEditRSVPModal = () => {
  showEditRSVPModal.value = false
  currentRSVPGuest.value = null
}

const onRSVPFormSubmit = async (payload) => {
  try {
    await submitGuestRSVP(payload)
    await fetchGuests()
    closeEditRSVPModal()
    showSuccess('Success', 'RSVP updated successfully')
  } catch (error) {
    handleError(error, 'Failed to update RSVP')
  }
}

// Helper to check if a string is an ISO date
const isISODateString = (str) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)

const exportToCSV = async () => {
  try {
    const allGuests = guests.value
    if (allGuests.length === 0) return
    // Derive columns from keys of first guest
    const columns = Object.keys(allGuests[0])
    // Build CSV header
    const header = columns.join(',') + '\n'
    // Build CSV rows
    const rows = allGuests.map((guest) => {
      return columns
        .map((col) => {
          let val = guest[col]
          if (typeof val === 'string' && isISODateString(val)) {
            const date = new Date(val)
            val = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
              .toString()
              .padStart(2, '0')}/${date.getFullYear()}`
          }
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            val = `"${val.replace(/"/g, '""')}"`
          }
          return val
        })
        .join(',')
    })
    const csvContent = header + rows.join('\n')
    // Generate filename with timestamp
    const now = new Date()
    const filename = `rsvp_list_${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now
      .getHours()
      .toString()
      .padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now
      .getSeconds()
      .toString()
      .padStart(2, '0')}.csv`
    // Create and download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    handleError(error, 'Failed to export CSV')
  }
}

onMounted(async () => {
  await fetchGuests()
  await fetchStats()
})
</script>
