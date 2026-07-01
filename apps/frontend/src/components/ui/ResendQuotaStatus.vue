<template>
  <div>
    <!-- Quota Status -->
    <SettingsSection v-if="quotaStatus" title="Resend Quota Status">
      <div class="space-y-4">
        <!-- Daily Quota -->
        <div>
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-txt">Daily Quota</span>
            <span :class="getQuotaPercentage(quotaStatus.daily) >= 80 ? 'text-[#8A6A00]' : 'text-[#7A6B55]'" class="text-sm font-semibold">
              {{ quotaStatus.daily.sent }} / {{ quotaStatus.daily.limit }} emails
            </span>
          </div>
          <ProgressBar
            :value="getQuotaPercentage(quotaStatus.daily)"
            :class="['h-2', getQuotaBarClass(quotaStatus.daily)]"
          />
          <p class="text-xs text-[#7A6B55] mt-1">
            Resets at {{ formatResetTime(quotaStatus.daily.resetsAt) }}
          </p>
        </div>

        <!-- Monthly Quota -->
        <div>
          <div class="flex justify-between items-center mb-2">
            <span class="text-sm font-medium text-txt">Monthly Quota</span>
            <span :class="getQuotaPercentage(quotaStatus.monthly) >= 80 ? 'text-[#8A6A00]' : 'text-[#7A6B55]'" class="text-sm font-semibold">
              {{ quotaStatus.monthly.sent }} / {{ quotaStatus.monthly.limit }} emails
            </span>
          </div>
          <ProgressBar
            :value="getQuotaPercentage(quotaStatus.monthly)"
            :class="['h-2', getQuotaBarClass(quotaStatus.monthly)]"
          />
          <p class="text-xs text-[#7A6B55] mt-1">
            Resets on {{ formatResetTime(quotaStatus.monthly.resetsAt) }}
          </p>
        </div>

        <!-- Queue Status -->
        <div v-if="quotaStatus.queue && quotaStatus.queue.length > 0" class="mt-4 p-3 bg-[#FCEFC7] border border-[#E3B13F] rounded-lg">
          <div class="flex items-center gap-2">
            <i class="i-solar:clock-circle-bold text-[#8A6A00]"></i>
            <div>
              <p class="text-sm font-medium text-[#8A6A00]">
                {{ quotaStatus.queue.length }} message(s) queued
              </p>
              <p v-if="quotaStatus.queue.validUntil" class="text-xs text-[#8A6A00]">
                Will be sent after {{ formatResetTime(quotaStatus.queue.validUntil) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </SettingsSection>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { fetchQuotaStatus } from '@/api/settings'
import ProgressBar from 'primevue/progressbar'
import SettingsSection from '@/components/ui/SettingsSection.vue'
import { formatDateWithTime } from '@/utils/dateFormatter'

const quotaStatus = ref(null)
let quotaRefreshInterval = null

onMounted(async () => {
  await loadQuotaStatus()
  // Auto-refresh quota every 30 seconds
  quotaRefreshInterval = setInterval(async () => {
    await loadQuotaStatus()
  }, 30000)
})

onUnmounted(() => {
  if (quotaRefreshInterval) {
    clearInterval(quotaRefreshInterval)
  }
})

async function loadQuotaStatus() {
  try {
    const status = await fetchQuotaStatus()
    quotaStatus.value = status
  } catch (error) {
    // Don't show error toast for quota - it's not critical
    // Silently fail for quota status
  }
}

function getQuotaPercentage(quota) {
  if (!quota || quota.limit === 0) return 0
  return Math.min(100, Math.round((quota.sent / quota.limit) * 100))
}

function getQuotaBarClass(quota) {
  const percentage = getQuotaPercentage(quota)
  if (percentage >= 100) return 'bg-[#B3453B]'
  if (percentage >= 80) return 'bg-[#8A6A00]'
  return 'bg-[#2E7D46]'
}

// Use centralized date formatter utility
function formatResetTime(isoString) {
  if (!isoString) return 'N/A'
  try {
    return formatDateWithTime(isoString)
  } catch (error) {
    return isoString
  }
}
</script>
