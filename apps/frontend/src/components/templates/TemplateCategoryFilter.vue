<template>
  <div class="template-category-filter">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900">Filter by Category</h3>
      <Button 
        label="Clear Filter" 
        icon="pi pi-times" 
        size="normal"
        text
        @click="clearFilter"
        v-if="selectedCategory !== 'all'"
      />
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="category in categories"
        :key="category"
        class="category-card"
        :class="{ 'selected': selectedCategory === category }"
        @click="selectCategory(category)"
      >
        <div class="flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md"
             :class="getCategoryClasses(category)">
          <i :class="getCategoryIcon(category)" class="text-lg"></i>
          <div class="flex-1">
            <h4 class="font-medium text-sm">{{ category }}</h4>
            <p class="text-xs text-gray-600">{{ getCategoryDescription(category) }}</p>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs font-medium">{{ getCategoryCount(category) }} templates</span>
              <Tag 
                :value="getCategoryCount(category)" 
                :severity="getCategoryColor(category)"
                size="normal"
              />
            </div>
          </div>
          <i class="pi pi-chevron-right text-gray-400" v-if="selectedCategory === category"></i>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { 
  getAllCategories, 
  getCategoryMetadata, 
  getCategoryColor, 
  getCategoryIcon,
  filterTemplatesByCategory 
} from '@/utils/templateCategories'

const props = defineProps({
  templates: {
    type: Array,
    default: () => []
  },
  selectedCategory: {
    type: String,
    default: 'all'
  }
})

const emit = defineEmits(['update:selectedCategory'])

const categories = computed(() => {
  return ['all', ...getAllCategories()]
})

function selectCategory(category) {
  emit('update:selectedCategory', category)
}

function clearFilter() {
  emit('update:selectedCategory', 'all')
}

function getCategoryDescription(category) {
  if (category === 'all') {
    return 'All templates'
  }
  const metadata = getCategoryMetadata(category)
  return metadata.description
}

function getCategoryCount(category) {
  if (category === 'all') {
    return props.templates.length
  }
  return filterTemplatesByCategory(props.templates, category).length
}

function getCategoryClasses(category) {
  const baseClasses = 'border-gray-200 hover:border-gray-300'
  const selectedClasses = 'border-blue-500 bg-blue-50'
  
  if (props.selectedCategory === category) {
    return `${baseClasses} ${selectedClasses}`
  }
  
  return baseClasses
}
</script>

<style scoped>
.category-card.selected {
  transform: scale(1.02);
}
</style> 