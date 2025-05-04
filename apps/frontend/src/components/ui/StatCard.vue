<template>
  <div class="p-4 bg-white rounded shadow">
    <template v-if="chartType === 'doughnut' && items.length">
      <p class="text-sm text-gray-500 mb-2">{{ title }}</p>
      <div class="mb-4" style="position: relative; height: 200px; width: 100%;">
        <canvas ref="canvasRef" class="w-full h-48"></canvas>
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span class="text-xl font-semibold">{{ centerText }}</span>
        </div>
      </div>
      <div class="flex justify-center space-x-4">
        <div
          v-for="(item, index) in items"
          :key="item.label"
          class="flex items-center space-x-1"
        >
          <span
            class="w-3 h-3 rounded-full"
            :style="{ backgroundColor: chartData.datasets[0].backgroundColor[index] }"
          ></span>
          <span class="text-sm text-gray-600">{{ item.label }}</span>
        </div>
      </div>
    </template>
    <template v-else-if="chartType === 'bar' && items.length">
      <p class="text-sm text-gray-500 mb-2">{{ title }}</p>
      <div class="mb-4" style="position: relative; height: 200px; width: 100%;">
        <canvas ref="canvasRef" class="w-full h-48"></canvas>
      </div>
    </template>
    <template v-else-if="items.length">
      <div v-for="item in items" :key="item.label" class="mb-4 last:mb-0">
        <p class="text-sm text-gray-500">{{ item.label }}</p>
        <p class="text-xl font-semibold">{{ item.value }}</p>
      </div>
    </template>
    <template v-else>
      <p class="text-sm text-gray-500">{{ title }}</p>
      <p class="text-2xl font-semibold">{{ value }}</p>
    </template>
  </div>
</template>

<script setup>
import Chart from 'chart.js/auto';
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';

const props = defineProps({
  title: { type: String, required: false },
  value: { type: [String, Number], required: false },
  items: { type: Array, required: false, default: () => [] },
  // chartType: 'single' | 'doughnut' | 'bar'
  chartType: { type: String, required: false, default: 'single' },
});

const canvasRef = ref(null);
let chartInstance = null;
const hoveredIndex = ref(null);

const chartData = computed(() => ({
  labels: props.items.map(i => i.label),
  datasets: [{
    data: props.items.map(i => Number(i.value)),
    backgroundColor: ['#3B82F6', '#F59E0B', '#EF4444'],
    hoverOffset: 4
  }]
}));

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
      plugins: { legend: { display: false } },
      onHover: (event, elements) => {
        hoveredIndex.value = elements.length ? elements[0].index : null;
      }
    };
  } else if (props.chartType === 'bar') {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } }
    };
  }
  return {};
});

onMounted(() => {
  if (props.chartType !== 'single' && props.items.length && canvasRef.value) {
    chartInstance = new Chart(canvasRef.value, {
      type: props.chartType,
      data: chartData.value,
      options: chartOptions.value
    });
  }
});

watch(
  () => props.items,
  (newItems) => {
    if (props.chartType !== 'single' && newItems.length && canvasRef.value) {
      if (chartInstance) {
        chartInstance.data = chartData.value;
        chartInstance.options = chartOptions.value;
        chartInstance.update();
      } else {
        chartInstance = new Chart(canvasRef.value, {
          type: props.chartType,
          data: chartData.value,
          options: chartOptions.value
        });
      }
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy();
  }
});
</script>