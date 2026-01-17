<template>
  <AdminPageWrapper 
    title="Admin Overview" 
    description="Monitor guest RSVP analytics and site performance"
  >
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <StatCard 
        title="Emails Sent" 
        :value="emailsSent" 
      />
      
      <StatCard
        title="RSVP Status"
        chartType="doughnut"
        :items="[
          { label: 'Going', value: stats.attending },
          { label: 'Not Going', value: stats.not_attending },
          { label: 'Pending', value: stats.pending }
        ]"
      />
      
      <StatCard
        title="Response Rate"
        chartType="doughnut"
        :items="[
          { label: 'Replied', value: stats.attending + stats.not_attending },
          { label: 'Pending', value: stats.pending }
        ]"
      />
    </div>

    <!-- Message Statistics by Type -->
    <Card class="mt-6">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-envelope text-acc-base"></i>
          <span>Message Statistics</span>
        </div>
      </template>
      <template #content>
        <Accordion v-model:value="activeMessageTab">
          <!-- Custom Messages Panel -->
          <AccordionPanel value="custom">
            <AccordionHeader>
              <div class="flex items-center gap-2 w-full">
                <Badge value="Custom Messages" severity="info" />
                <span class="text-sm text-gray-500">
                  ({{ messageStats.custom.pagination.total }} total)
                </span>
              </div>
            </AccordionHeader>
            <AccordionContent>
              <div v-if="messageStatsLoading && activeMessageTab === 'custom'" class="text-center py-8">
                <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
                <p class="mt-2 text-gray-600">Loading message statistics...</p>
              </div>
              <div v-else>
                <MessageList
                  :messages="messageStats.custom.messages"
                  :type="'custom'"
                  :expanded-message-id="expandedMessageId"
                  @expand="handleExpandMessage"
                />
                <div v-if="messageStats.custom.pagination.totalPages > 1" class="flex items-center justify-between mt-4 p-2">
                  <Button
                    label="Previous"
                    icon="pi pi-chevron-left"
                    severity="secondary"
                    :disabled="messageStats.custom.pagination.page === 1"
                    @click="loadMessageStats({ page_custom: messageStats.custom.pagination.page - 1 })"
                  />
                  <span class="text-sm text-gray-600">
                    Page {{ messageStats.custom.pagination.page }} of {{ messageStats.custom.pagination.totalPages }}
                  </span>
                  <Button
                    label="Next"
                    icon="pi pi-chevron-right"
                    iconPos="right"
                    severity="secondary"
                    :disabled="messageStats.custom.pagination.page >= messageStats.custom.pagination.totalPages"
                    @click="loadMessageStats({ page_custom: messageStats.custom.pagination.page + 1 })"
                  />
                </div>
                <p v-if="messageStats.custom.messages.length === 0" class="text-gray-500 italic py-4">
                  No Custom Messages messages sent yet
                </p>
              </div>
            </AccordionContent>
          </AccordionPanel>

          <!-- RSVP Attending Panel -->
          <AccordionPanel value="rsvpAttending">
            <AccordionHeader>
              <div class="flex items-center gap-2 w-full">
                <Badge value="RSVP Confirmations (Attending)" severity="success" />
                <span class="text-sm text-gray-500">
                  ({{ messageStats.rsvpAttending.pagination.total }} total)
                </span>
              </div>
            </AccordionHeader>
            <AccordionContent>
              <div v-if="messageStatsLoading && activeMessageTab === 'rsvpAttending'" class="text-center py-8">
                <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
                <p class="mt-2 text-gray-600">Loading message statistics...</p>
              </div>
              <div v-else>
                <MessageList
                  :messages="messageStats.rsvpAttending.messages"
                  :type="'rsvpAttending'"
                  :expanded-message-id="expandedMessageId"
                  @expand="handleExpandMessage"
                />
                <div v-if="messageStats.rsvpAttending.pagination.totalPages > 1" class="flex items-center justify-between mt-4 p-2">
                  <Button
                    label="Previous"
                    icon="pi pi-chevron-left"
                    severity="secondary"
                    :disabled="messageStats.rsvpAttending.pagination.page === 1"
                    @click="loadMessageStats({ page_rsvpAttending: messageStats.rsvpAttending.pagination.page - 1 })"
                  />
                  <span class="text-sm text-gray-600">
                    Page {{ messageStats.rsvpAttending.pagination.page }} of {{ messageStats.rsvpAttending.pagination.totalPages }}
                  </span>
                  <Button
                    label="Next"
                    icon="pi pi-chevron-right"
                    iconPos="right"
                    severity="secondary"
                    :disabled="messageStats.rsvpAttending.pagination.page >= messageStats.rsvpAttending.pagination.totalPages"
                    @click="loadMessageStats({ page_rsvpAttending: messageStats.rsvpAttending.pagination.page + 1 })"
                  />
                </div>
                <p v-if="messageStats.rsvpAttending.messages.length === 0" class="text-gray-500 italic py-4">
                  No RSVP Confirmations (Attending) messages sent yet
                </p>
              </div>
            </AccordionContent>
          </AccordionPanel>

          <!-- RSVP Not Attending Panel -->
          <AccordionPanel value="rsvpNotAttending">
            <AccordionHeader>
              <div class="flex items-center gap-2 w-full">
                <Badge value="RSVP Confirmations (Not Attending)" severity="warning" />
                <span class="text-sm text-gray-500">
                  ({{ messageStats.rsvpNotAttending.pagination.total }} total)
                </span>
              </div>
            </AccordionHeader>
            <AccordionContent>
              <div v-if="messageStatsLoading && activeMessageTab === 'rsvpNotAttending'" class="text-center py-8">
                <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
                <p class="mt-2 text-gray-600">Loading message statistics...</p>
              </div>
              <div v-else>
                <MessageList
                  :messages="messageStats.rsvpNotAttending.messages"
                  :type="'rsvpNotAttending'"
                  :expanded-message-id="expandedMessageId"
                  @expand="handleExpandMessage"
                />
                <div v-if="messageStats.rsvpNotAttending.pagination.totalPages > 1" class="flex items-center justify-between mt-4 p-2">
                  <Button
                    label="Previous"
                    icon="pi pi-chevron-left"
                    severity="secondary"
                    :disabled="messageStats.rsvpNotAttending.pagination.page === 1"
                    @click="loadMessageStats({ page_rsvpNotAttending: messageStats.rsvpNotAttending.pagination.page - 1 })"
                  />
                  <span class="text-sm text-gray-600">
                    Page {{ messageStats.rsvpNotAttending.pagination.page }} of {{ messageStats.rsvpNotAttending.pagination.totalPages }}
                  </span>
                  <Button
                    label="Next"
                    icon="pi pi-chevron-right"
                    iconPos="right"
                    severity="secondary"
                    :disabled="messageStats.rsvpNotAttending.pagination.page >= messageStats.rsvpNotAttending.pagination.totalPages"
                    @click="loadMessageStats({ page_rsvpNotAttending: messageStats.rsvpNotAttending.pagination.page + 1 })"
                  />
                </div>
                <p v-if="messageStats.rsvpNotAttending.messages.length === 0" class="text-gray-500 italic py-4">
                  No RSVP Confirmations (Not Attending) messages sent yet
                </p>
              </div>
            </AccordionContent>
          </AccordionPanel>
        </Accordion>
      </template>
    </Card>

    <!-- Quick Actions -->
    <Card class="mt-6">
      <template #title>
        <div class="flex items-center gap-2">
          <i class="pi pi-bolt text-acc-base"></i>
          <span>Quick Actions</span>
        </div>
      </template>
      <template #content>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button 
            label="Add Guest" 
            icon="pi pi-user-plus" 
            severity="primary"
            @click="$router.push('/admin/guests/overview')"
            class="h-12"
          />
          <Button 
            label="Create Page" 
            icon="pi pi-file-plus" 
            severity="secondary"
            @click="$router.push('/admin/pages')"
            class="h-12"
          />
          <Button 
            label="Upload Media" 
            icon="pi pi-upload" 
            severity="secondary"
            @click="$router.push('/admin/media')"
            class="h-12"
          />
          <Button 
            label="Settings" 
            icon="pi pi-cog" 
            severity="secondary"
            @click="$router.push('/admin/settings')"
            class="h-12"
          />
        </div>
      </template>
    </Card>
  </AdminPageWrapper>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { fetchGuestAnalytics } from '@/api/analytics'
import { fetchMessageStatsByType } from '@/api/messageStats'
import AdminPageWrapper from '@/components/AdminPageWrapper.vue'
import StatCard from '@/components/ui/StatCard.vue'
import MessageList from '@/components/messaging/MessageList.vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import Badge from 'primevue/badge'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import { useErrorHandler } from '@/composables/useErrorHandler'

const { handleError } = useErrorHandler({ showToast: false }) // Silent errors for overview
const emailsSent = ref(0)
const stats = ref({ attending: 0, not_attending: 0, pending: 0 })
const activeMessageTab = ref(null) // Single panel open at a time (standard accordion) - value is 'custom', 'rsvpAttending', or 'rsvpNotAttending'
const messageStatsLoading = ref(false)
const expandedMessageId = ref(null)
const messageStats = ref({
  custom: { messages: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
  rsvpAttending: { messages: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
  rsvpNotAttending: { messages: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } }
})

const loadMessageStats = async (options = {}) => {
  messageStatsLoading.value = true
  try {
    const currentOptions = {
      page_custom: messageStats.value.custom.pagination.page,
      page_rsvpAttending: messageStats.value.rsvpAttending.pagination.page,
      page_rsvpNotAttending: messageStats.value.rsvpNotAttending.pagination.page,
      limit: 10,
      ...options
    }
    const data = await fetchMessageStatsByType(currentOptions)
    messageStats.value = data
  } catch (error) {
    handleError(error, 'Failed to load message statistics')
  } finally {
    messageStatsLoading.value = false
  }
}

const handleExpandMessage = (messageId) => {
  // Accordion handles expansion, just track the ID
  expandedMessageId.value = expandedMessageId.value === messageId ? null : messageId
}

// Load message stats when a panel is expanded
watch(activeMessageTab, (newValue) => {
  if (newValue !== null && newValue !== undefined) {
    // Always load data when a panel is opened (refresh on each open)
    loadMessageStats()
  }
})

onMounted(async () => {
  try {
    const res = await fetchGuestAnalytics()
    emailsSent.value = res.emailsSent || 0
    stats.value.attending = res.stats.attending
    stats.value.not_attending = res.stats.not_attending
    stats.value.pending = res.stats.pending
  } catch (error) {
    // Silently fail for overview - not critical
  }
})
</script>

<style scoped>
.stat-card {
  @apply transition-all duration-200 hover:shadow-lg;
}

.stat-card:hover {
  @apply transform scale-105;
}
</style>
