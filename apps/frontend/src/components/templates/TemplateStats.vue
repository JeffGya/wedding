<template>
  <div class="template-stats">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card v-for="stat in stats" :key="stat.category" class="stat-card">
        <template #content>
          <div class="flex items-center gap-3">
            <div class="stat-icon" :class="`bg-${stat.color}-100`">
              <i :class="[stat.icon, `text-${stat.color}-600`]"></i>
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900">{{ stat.count }}</h3>
              <p class="text-sm text-gray-600">{{ stat.category }}</p>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getTemplateStats, getAllCategories, getCategoryMetadata } from '@/utils/templateCategories'

const props = defineProps({
  templates: {
    type: Array,
    default: () => []
  }
})

const stats = computed(() => {
  const templateStats = getTemplateStats(props.templates)
  const allCategories = getAllCategories()
  
  return allCategories.map(category => {
    const metadata = getCategoryMetadata(category)
    return {
      category,
      count: templateStats[category] || 0,
      icon: metadata.icon,
      color: metadata.color
    }
  }).filter(stat => stat.count > 0)
})
</script>

<style scoped>
.stat-icon {
  @apply w-12 h-12 rounded-lg flex items-center justify-center;
}
</style> 