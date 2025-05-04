<template>
  <div class="p-6">
    <div class="text-center mb-8">
      <h1 class="text-4xl font-bold text-gray-800">Admin Overview</h1>
      <p class="text-gray-600">Admin dashboard with guest RSVP analytics.</p>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <StatCard title="Emails Sent" :value="emailsSent" />
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { fetchGuestAnalytics } from '@/api/analytics'
import StatCard from '@/components/ui/StatCard.vue'

const emailsSent = ref(0)
const stats = ref({ attending: 0, not_attending: 0, pending: 0 })

onMounted(async () => {
  try {
    const res = await fetchGuestAnalytics()
    emailsSent.value = res.stats.total
    stats.value.attending = res.stats.attending
    stats.value.not_attending = res.stats.not_attending
    stats.value.pending = res.stats.pending
    // TODO: wire up real email stats API in the future
  } catch (error) {
    console.error('Failed to load guest analytics', error)
  }
})
</script>
