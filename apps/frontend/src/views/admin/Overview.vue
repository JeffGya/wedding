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

    <!-- Quick Actions -->
    <Card>
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
import { ref, onMounted } from 'vue'
import { fetchGuestAnalytics } from '@/api/analytics'
import AdminPageWrapper from '@/components/AdminPageWrapper.vue'
import StatCard from '@/components/ui/StatCard.vue'
import Card from 'primevue/card'
import Button from 'primevue/button'
import { useErrorHandler } from '@/composables/useErrorHandler'

const { handleError } = useErrorHandler({ showToast: false }) // Silent errors for overview
const emailsSent = ref(0)
const stats = ref({ attending: 0, not_attending: 0, pending: 0 })

onMounted(async () => {
  try {
    const res = await fetchGuestAnalytics()
    emailsSent.value = res.stats.total
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
