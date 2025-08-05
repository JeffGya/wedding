<template>
  <Card class="stat-card h-full transition-all duration-200 hover:shadow-lg">
    <template #content>
      <!-- Single Value Display -->
      <template v-if="!chartType && !items.length && value !== undefined">
        <div class="flex flex-col items-center justify-center h-full p-4">
          <h3 class="text-lg font-semibold text-text mb-4 text-center">{{ title }}</h3>
          <div class="flex-1 flex items-center justify-center">
            <span class="text-4xl md:text-5xl font-bold text-acc-base">{{ value }}</span>
          </div>
        </div>
      </template>

      <!-- Items List Display -->
      <template v-else-if="items.length && !chartType">
        <div class="flex flex-col h-full p-4">
          <h3 class="text-lg font-semibold text-text mb-4 text-center">{{ title }}</h3>
          <div class="flex-1 flex items-center justify-center">
            <span class="text-4xl md:text-5xl font-bold text-acc-base">{{ items[0].value }}</span>
          </div>
        </div>
      </template>

      <!-- Doughnut Chart -->
      <template v-else-if="chartType === 'doughnut' && items.length">
        <div class="flex flex-col h-full p-4">
          <h3 class="text-lg font-semibold text-text mb-4 text-center">{{ title }}</h3>
          
          <!-- Chart Container -->
          <div class="flex-1 relative min-h-[200px]">
            <Chart 
              type="doughnut" 
              :data="chartData" 
              :options="chartOptions"
              class="w-full h-full" 
            />
            
            <!-- Center Text Overlay -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span class="text-2xl md:text-3xl font-bold text-text">{{ centerText }}</span>
            </div>
          </div>
          
          <!-- Legend -->
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="(item, index) in items"
              :key="item.label"
              class="flex items-center gap-2 text-sm"
            >
              <span
                class="w-3 h-3 rounded-full flex-shrink-0"
                :style="{ backgroundColor: chartData.datasets[0].backgroundColor[index] }"
              ></span>
              <span class="text-text truncate">{{ item.label }}</span>
              <span class="text-form-placeholder-text ml-auto">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Bar Chart -->
      <template v-else-if="chartType === 'bar' && items.length">
        <div class="flex flex-col h-full p-4">
          <h3 class="text-lg font-semibold text-text mb-4 text-center">{{ title }}</h3>
          
          <!-- Chart Container -->
          <div class="flex-1 relative min-h-[200px]">
            <Chart 
              type="bar" 
              :data="chartData" 
              :options="chartOptions"
              class="w-full h-full" 
            />
          </div>
          
          <!-- Legend -->
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="(item, index) in items"
              :key="item.label"
              class="flex items-center gap-2 text-sm"
            >
              <span
                class="w-3 h-3 rounded-full flex-shrink-0"
                :style="{ backgroundColor: chartData.datasets[0].backgroundColor[index] }"
              ></span>
              <span class="text-text truncate">{{ item.label }}</span>
              <span class="text-form-placeholder-text ml-auto">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Horizontal Bar Chart -->
      <template v-else-if="chartType === 'bar-horizontal' && items.length">
        <div class="flex flex-col h-full p-4">
          <h3 class="text-lg font-semibold text-text mb-4 text-center">{{ title }}</h3>
          
          <!-- Chart Container -->
          <div class="flex-1 relative min-h-[200px]">
            <Chart 
              type="bar" 
              :data="chartData" 
              :options="horizontalBarOptions"
              class="w-full h-full" 
            />
          </div>
          
          <!-- Legend -->
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div
              v-for="(item, index) in items"
              :key="item.label"
              class="flex items-center gap-2 text-sm"
            >
              <span
                class="w-3 h-3 rounded-full flex-shrink-0"
                :style="{ backgroundColor: chartData.datasets[0].backgroundColor[index] }"
              ></span>
              <span class="text-text truncate">{{ item.label }}</span>
              <span class="text-form-placeholder-text ml-auto">{{ item.value }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Fallback -->
      <template v-else>
        <div class="flex flex-col items-center justify-center h-full p-4">
          <h3 class="text-lg font-semibold text-text mb-4 text-center">{{ title }}</h3>
          <div class="flex-1 flex items-center justify-center">
            <span class="text-4xl md:text-5xl font-bold text-acc-base">{{ value || 0 }}</span>
          </div>
        </div>
      </template>
    </template>
  </Card>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  title: { type: String, required: false },
  value: { type: [String, Number], required: false },
  items: { type: Array, required: false, default: () => [] },
  chartType: { type: String, required: false, default: 'single' },
});

const hoveredIndex = ref(null);

const chartData = computed(() => {
  const rootStyles = getComputedStyle(document.documentElement);
  const cssVars = ['--int-base', '--acc-base', '--acc2-base'];
  const bgColors = cssVars.map(varName => rootStyles.getPropertyValue(varName).trim());
  
  return {
    labels: props.items.map(i => i.label),
    datasets: [{
      data: props.items.map(i => Number(i.value)),
      backgroundColor: bgColors,
      hoverOffset: 4,
      borderWidth: 0
    }]
  };
});

const totalValue = computed(() =>
  props.items.reduce((sum, i) => sum + Number(i.value), 0)
);

const centerText = computed(() =>
  hoveredIndex.value != null
    ? props.items[hoveredIndex.value].value
    : totalValue.value
);

const chartOptions = computed(() => {
  if (props.chartType === 'doughnut') {
    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: { 
        legend: { display: false },
        tooltip: {
          backgroundColor: 'var(--card-bg)',
          titleColor: 'var(--text)',
          bodyColor: 'var(--text)',
          borderColor: 'var(--form-border)',
          borderWidth: 1
        }
      },
      onHover: (event, elements) => {
        hoveredIndex.value = elements.length ? elements[0].index : null;
      }
    };
  } else if (props.chartType === 'bar') {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        tooltip: {
          backgroundColor: 'var(--card-bg)',
          titleColor: 'var(--text)',
          bodyColor: 'var(--text)',
          borderColor: 'var(--form-border)',
          borderWidth: 1
        }
      },
      scales: { 
        x: { 
          beginAtZero: true,
          grid: {
            color: 'var(--form-border)',
            drawBorder: false
          },
          ticks: {
            color: 'var(--form-placeholder-text)'
          }
        },
        y: {
          grid: {
            color: 'var(--form-border)',
            drawBorder: false
          },
          ticks: {
            color: 'var(--form-placeholder-text)'
          }
        }
      }
    };
  }
  return {};
});

const horizontalBarOptions = computed(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: { 
    legend: { display: false },
    tooltip: {
      backgroundColor: 'var(--card-bg)',
      titleColor: 'var(--text)',
      bodyColor: 'var(--text)',
      borderColor: 'var(--form-border)',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { 
        color: 'var(--form-border)', 
        drawBorder: false 
      },
      ticks: { 
        color: 'var(--form-placeholder-text)',
        stepSize: 1
      }
    },
    y: {
      grid: { 
        color: 'var(--form-border)', 
        drawBorder: false 
      },
      ticks: { 
        color: 'var(--form-placeholder-text)'
      }
    }
  }
}));
</script>

<style scoped>
.stat-card {
  @apply transition-all duration-200 hover:shadow-lg;
}

.stat-card:hover {
  @apply transform scale-105;
}

/* Ensure charts are responsive */
:deep(.chart-container) {
  position: relative;
  height: 100%;
  width: 100%;
}

/* Improve chart responsiveness */
:deep(canvas) {
  max-width: 100% !important;
  height: auto !important;
}
</style>