<template>
  <AdminPageWrapper 
    title="Guest Messages" 
    description="View sent and scheduled emails to guests"
  >
    <template #headerActions>
      <Button 
        label="New Message" 
        icon="pi pi-plus" 
        severity="primary" 
        @click="$router.push('/admin/guests/messages/new')"
      />
    </template>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatCard
        title="Total Messages"
        :value="messages.length"
      />
      <StatCard
        title="Drafts"
        :value="draftCount"
      />
      <StatCard
        title="Scheduled"
        :value="scheduledCount"
      />
      <StatCard
        title="Sent"
        :value="sentCount"
      />
    </div>

    <!-- Messages Timeline -->
    <Card>
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-envelope text-acc-base"></i>
          <span>Message Timeline</span>
        </div>
      </template>
      <template #content>
        <div v-if="messages.length > 0">
          <Timeline :value="events" class="w-full">
            <template #opposite="{ item }">
              <div class="text-sm text-form-placeholder-text">
                <div>Created: {{ formatDate(item.created) }}</div>
                <div v-if="item.updated && item.updated !== item.created">
                  Updated: {{ formatDate(item.updated) }}
                </div>
                <div v-if="item.scheduled">
                  Scheduled: {{ formatDate(item.scheduled) }}
                </div>
              </div>
            </template>
            <template #content="{ item }">
              <Panel
                :header="item.msg.subject"
                class="mb-4 cursor-pointer hover:shadow-md transition-shadow"
                @click="goToDetail(item.msg.id)"
              >
                <template #header>
                  <div class="flex items-center justify-between w-full">
                    <span class="font-semibold text-text">{{ item.msg.subject }}</span>
                    <Tag
                      :value="getStatusLabel(item.msg.status)"
                      :severity="getStatusSeverity(item.msg.status)"
                    />
                  </div>
                </template>
                
                <div class="space-y-2">
                  <p class="text-sm text-form-placeholder-text">
                    {{ getStatusDescription(item.msg) }}
                  </p>
                  
                  <div v-if="item.msg.status === 'sent'" class="text-xs text-form-placeholder-text">
                    <span v-if="item.msg.sentCount > 0" class="text-success">✅ {{ item.msg.sentCount }} sent</span>
                    <span v-if="item.msg.failedCount > 0" class="text-danger ml-2">❌ {{ item.msg.failedCount }} failed</span>
                  </div>
                </div>
                
                <template #footer>
                  <div class="flex gap-2">
                    <Button
                      v-if="item.msg.status === 'draft' || item.msg.status === 'scheduled'"
                      label="Edit"
                      icon="pi pi-pencil"
                      severity="secondary"
                      size="normal"
                      @click.stop="goToDetail(item.msg.id, true)"
                    />
                    <Button
                      v-if="item.msg.status === 'draft' || item.msg.status === 'scheduled'"
                      label="Delete"
                      icon="i-solar:trash-bin-trash-bold-duotone"
                      severity="danger"
                      size="normal"
                      @click.stop="deleteMessage(item.msg.id)"
                    />
                    <Button
                      v-if="item.msg.status === 'sent' && item.msg.failedCount > 0"
                      label="Resend Failed"
                      icon="pi pi-redo"
                      severity="warning"
                      size="normal"
                      @click.stop="resendFailed(item.msg.id)"
                    />
                  </div>
                </template>
              </Panel>
            </template>
          </Timeline>
        </div>
        
        <div v-else class="text-center py-12">
          <i class="pi pi-envelope text-6xl text-form-placeholder-text mb-4"></i>
          <h3 class="text-xl font-semibold text-text mb-2">No Messages Yet</h3>
          <p class="text-form-placeholder-text mb-4">Start by creating your first message to guests</p>
          <Button 
            label="Create Message" 
            icon="pi pi-plus" 
            severity="primary"
            @click="$router.push('/admin/guests/messages/new')"
          />
        </div>
      </template>
    </Card>

    <!-- Template Management Link -->
    <div class="mt-6 text-center">
      <RouterLink
        to="/admin/templates"
        class="text-acc-base hover:text-acc-dark underline"
      >
        <i class="pi pi-file-edit mr-2"></i>
        Manage Message Templates
      </RouterLink>
    </div>
  </AdminPageWrapper>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import AdminPageWrapper from '@/components/AdminPageWrapper.vue'
import StatCard from '@/components/ui/StatCard.vue'
import { useToastService } from '@/utils/toastService'
import { formatDateTimeShort } from '@/utils/dateFormatter'
import { useLoading } from '@/composables/useLoading'
import { useErrorHandler } from '@/composables/useErrorHandler'

const router = useRouter()
const { showSuccess, showError, showWarning } = useToastService()
const { loading } = useLoading()
const { handleError: handleApiError } = useErrorHandler({ showToast: true })
const messages = ref([])

// Stats computation
const draftCount = computed(() => messages.value.filter(m => m.status === 'draft').length)
const scheduledCount = computed(() => messages.value.filter(m => m.status === 'scheduled').length)
const sentCount = computed(() => messages.value.filter(m => m.status === 'sent').length)

const events = computed(() =>
  messages.value
    .map(msg => ({
      id: msg.id,
      created: msg.created_at,
      updated: msg.updated_at,
      scheduled: msg.status === 'scheduled' ? msg.scheduled_for : null,
      msg
    }))
    .sort((a, b) => new Date(b.created) - new Date(a.created))
)

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

const getStatusDescription = (msg) => {
  if (msg.status === 'scheduled') {
    return `Scheduled for: ${formatDate(msg.scheduled_for)}`
  } else if (msg.status === 'sent') {
    return 'Message sent to recipients'
  } else {
    return `Last updated: ${formatDate(msg.updated_at)}`
  }
}

const goToDetail = (id, edit = false) => {
  router.push(edit ? `/admin/guests/messages/${id}/edit` : `/admin/guests/messages/${id}`)
}

// Use centralized date formatter utility
const formatDate = (dateValue) => {
  return formatDateTimeShort(dateValue)
}

const fetchMessages = async () => {
  loading.value = true
  try {
    const response = await api.get('/messages')
    
    // Check if response has the expected structure
    if (response.data && response.data.success && response.data.messages) {
      messages.value = response.data.messages
    } else if (Array.isArray(response.data)) {
      // Fallback: if response.data is directly an array
      messages.value = response.data
    } else {
      console.error('Unexpected API response structure:', response.data)
      messages.value = []
    }
  } catch (error) {
    handleApiError(error, 'Failed to load messages')
    messages.value = []
  } finally {
    loading.value = false
  }
}

const deleteMessage = async (id) => {
  if (!confirm('Are you sure you want to delete this message?')) return
  
  try {
    await api.delete(`/messages/${id}`)
    messages.value = messages.value.filter(m => m.id !== id)
    showSuccess('Success', 'Message deleted successfully')
  } catch (error) {
    handleApiError(error, 'Failed to delete message')
  }
}

const resendFailed = async (id) => {
  try {
    const response = await api.post(`/messages/${id}/resend`)
    const { sentCount, failedCount } = response.data
    
    showSuccess('Resend Complete', `✅ ${sentCount} sent, ❌ ${failedCount} failed`, 5000)
    
    // Refresh messages to update stats
    await fetchMessages()
  } catch (error) {
    handleApiError(error, 'Failed to resend failed messages')
  }
}

onMounted(() => {
  fetchMessages()
})
</script>
