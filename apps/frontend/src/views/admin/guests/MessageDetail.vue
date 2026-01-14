<template>
  <AdminPageWrapper 
    title="Message Details" 
    description="View message content and delivery statistics"
  >
    <template #headerActions>
      <Button 
        icon="pi pi-arrow-left" 
        severity="secondary" 
        text
        @click="$router.push('/admin/guests/messages')"
        v-tooltip.top="'Back to Messages'"
      />
    </template>

    <div v-if="message" class="space-y-6">
      <!-- Message Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          title="Total Recipients"
          :value="deliveryLogs.length"
        />
        <StatCard
          title="Successfully Sent"
          :value="sentCount"
        />
        <StatCard
          title="Failed Deliveries"
          :value="failedCount"
        />
      </div>

      <!-- Message Content -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-envelope text-acc-base"></i>
            <span>Message Content</span>
          </div>
        </template>
        <template #content>
          <div class="space-y-6">
            <!-- Subject -->
            <div class="space-y-3">
              <div>
                <label class="text-sm font-semibold text-form-placeholder-text">Subject (English)</label>
                <p class="text-lg text-text mt-1">{{ message.subject_en || message.subject || '—' }}</p>
              </div>
              <div>
                <label class="text-sm font-semibold text-form-placeholder-text">Subject (Lithuanian)</label>
                <p class="text-lg text-text mt-1">{{ message.subject_lt || message.subject || '—' }}</p>
              </div>
            </div>

            <!-- Status -->
            <div class="flex items-center gap-4">
              <div>
                <label class="text-sm font-semibold text-form-placeholder-text">Status</label>
                <div class="mt-1">
                  <Tag 
                    :value="getStatusLabel(message.status)" 
                    :severity="getStatusSeverity(message.status)"
                  />
                </div>
              </div>
              
              <div v-if="message.status === 'scheduled'">
                <label class="text-sm font-semibold text-form-placeholder-text">Scheduled For</label>
                <p class="text-text mt-1">{{ formatScheduledTime(message.scheduled_for) }}</p>
              </div>
            </div>

            <!-- Message Bodies -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label class="text-sm font-semibold text-form-placeholder-text">English Content</label>
                <div class="mt-2 p-4 bg-card-bg border border-form-border rounded-lg prose max-w-none">
                  <div v-html="message.body_en"></div>
                </div>
              </div>
              
              <div>
                <label class="text-sm font-semibold text-form-placeholder-text">Lithuanian Content</label>
                <div class="mt-2 p-4 bg-card-bg border border-form-border rounded-lg prose max-w-none">
                  <div v-html="message.body_lt"></div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Delivery Logs -->
      <Card>
        <template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-users text-acc-base"></i>
            <span>Recipient Delivery Logs</span>
          </div>
        </template>
        <template #content>
          <DataTable
            :value="deliveryLogs"
            stripedRows
            paginator
            :rows="10"
            :rowsPerPageOptions="[10, 25, 50]"
            filterDisplay="menu"
            :globalFilterFields="['name', 'email', 'group_label']"
            class="p-datatable-sm"
          >
            <template #header>
              <div class="flex justify-between items-center">
                <span class="text-lg font-semibold">Recipients</span>
                <span class="p-input-icon-left">
                  <i class="pi pi-search" />
                  <InputText v-model="filters.global" placeholder="Search recipients..." />
                </span>
              </div>
            </template>

            <Column field="name" header="Name" sortable>
              <template #body="{ data }">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ data.name }}</span>
                  <span v-if="data.group_label" class="text-xs bg-acc-base text-white px-2 py-1 rounded-full">
                    {{ data.group_label }}
                  </span>
                </div>
              </template>
            </Column>

            <Column field="email" header="Email" sortable>
              <template #body="{ data }">
                <span class="text-sm">{{ data.email }}</span>
              </template>
            </Column>

            <Column field="delivery_status" header="Status" sortable>
              <template #body="{ data }">
                <Tag 
                  :value="getDeliveryStatusLabel(data.delivery_status)" 
                  :severity="getDeliveryStatusSeverity(data.delivery_status)"
                />
              </template>
            </Column>

            <Column field="created_at" header="Sent At" sortable>
              <template #body="{ data }">
                <span v-if="data.created_at" class="text-sm text-form-placeholder-text">
                  {{ formatDate(data.created_at) }}
                </span>
                <span v-else class="text-form-placeholder-text">—</span>
              </template>
            </Column>

            <Column field="error_message" header="Error" sortable>
              <template #body="{ data }">
                <span v-if="data.error_message" class="text-sm text-danger">
                  {{ data.error_message }}
                </span>
                <span v-else class="text-form-placeholder-text">—</span>
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </div>

    <div v-else class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-form-placeholder-text mb-4"></i>
      <p class="text-form-placeholder-text">Loading message details...</p>
    </div>

    <!-- Action Buttons - Fixed to respect sidebar -->
    <div v-if="message" class="fixed bottom-0 z-10 bg-bg-glass backdrop-blur-sm border-t border-form-border p-4 transition-all duration-300"
         :class="[
           'md:left-64', // Account for sidebar width on desktop
           'left-0 right-0', // Full width on mobile
           'md:right-0' // Stop at right edge on desktop
         ]">
      <div class="max-w-7xl mx-auto flex justify-between items-center">
        <div>
          <Button
            v-if="message.status === 'draft' || message.status === 'scheduled'"
            label="Delete Message"
            icon="i-solar:trash-bin-trash-bold-duotone"
            size="normal"
            severity="danger"
            @click="deleteMessage(message.id)"
          />
        </div>
        
        <div class="flex gap-4">
          <Button
            v-if="message.status === 'draft' || message.status === 'scheduled'"
            label="Edit Message"
            icon="pi pi-pencil"
            severity="secondary"
            @click="$router.push(`/admin/guests/messages/${message.id}/edit`)"
          />
          <Button
            v-if="message.status === 'sent' && failedCount > 0"
            label="Resend Failed"
            icon="pi pi-redo"
            severity="warning"
            @click="resendFailed"
          />
        </div>
      </div>
    </div>
  </AdminPageWrapper>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api'
import AdminPageWrapper from '@/components/AdminPageWrapper.vue'
import StatCard from '@/components/ui/StatCard.vue'
import { useToastService } from '@/utils/toastService'
import { formatDateWithTime, formatDateTimeShort } from '@/utils/dateFormatter'
import { useErrorHandler } from '@/composables/useErrorHandler'

const route = useRoute()
const router = useRouter()
const { showSuccess, showWarning } = useToastService()
const { handleError } = useErrorHandler({ showToast: true })

const message = ref(null)
const deliveryLogs = ref([])
const filters = ref({
  global: null
})

// Stats computation
const sentCount = computed(() => deliveryLogs.value.filter(log => log.delivery_status === 'sent').length)
const failedCount = computed(() => deliveryLogs.value.filter(log => log.delivery_status === 'failed').length)
const pendingCount = computed(() => deliveryLogs.value.filter(log => log.delivery_status === 'pending').length)

const getStatusLabel = (status) => {
  const labels = {
    draft: 'Draft',
    scheduled: 'Scheduled',
    sent: 'Sent'
  }
  return labels[status] || status
}

const getStatusSeverity = (status) => {
  const severities = {
    draft: 'info',
    scheduled: 'warning',
    sent: 'success'
  }
  return severities[status] || 'info'
}

const getDeliveryStatusLabel = (status) => {
  const labels = {
    sent: 'Sent',
    failed: 'Failed',
    pending: 'Pending'
  }
  return labels[status] || status
}

const getDeliveryStatusSeverity = (status) => {
  const severities = {
    sent: 'success',
    failed: 'danger',
    pending: 'warning'
  }
  return severities[status] || 'info'
}

// Use centralized date formatter utilities
const formatScheduledTime = (dateValue) => {
  return formatDateWithTime(dateValue)
}

const formatDate = (dateValue) => {
  return formatDateTimeShort(dateValue)
}

const fetchMessage = async () => {
  try {
    const response = await api.get(`/messages/${route.params.id}`)
    message.value = response.data.message
    
    // Fetch delivery logs
    const logsResponse = await api.get(`/messages/${route.params.id}/logs`)
    deliveryLogs.value = logsResponse.data.logs
  } catch (error) {
    handleError(error, 'Failed to load message details')
  }
}

const deleteMessage = async (id) => {
  if (!confirm('Are you sure you want to delete this message?')) return
  
  try {
    await api.delete(`/messages/${id}`)
    showSuccess('Success', 'Message deleted successfully')
    router.push('/admin/guests/messages')
  } catch (error) {
    handleError(error, 'Failed to delete message')
  }
}

const resendFailed = async () => {
  try {
    const response = await api.post(`/messages/${message.value.id}/resend`)
    const { sentCount, failedCount } = response.data
    
    showSuccess('Resend Complete', `✅ ${sentCount} sent, ❌ ${failedCount} failed`, 5000)
    
    // Refresh data
    await fetchMessage()
  } catch (error) {
    handleError(error, 'Failed to resend failed messages')
  }
}

onMounted(() => {
  fetchMessage()
})
</script>