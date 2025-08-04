<template>
  <Card class="aspect-square relative overflow-hidden">
    <template #content>
      <template v-if="chartType === 'doughnut' && items.length">
        <p class="text-lg/7 font-serif text-center">{{ title }}</p>
        <div class="absolute inset-x-0 top-[5rem] bottom-[5rem] flex flex-col items-center justify-center">
          <Chart type="doughnut" :data="chartData" :options="chartOptions"
            class="w-full h-full max-w-full max-h-full" />
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span class="text-5xl font-semibold font-serif">{{ centerText }}</span>
          </div>
        </div>
        <div class="absolute inset-x-0 bottom-0 px-2 pb-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 justify-items-center w-full">
          <div
            v-for="(item, index) in items"
            :key="item.label"
            class="flex items-center space-x-1"
          >
            <span
              class="w-4 h-4 rounded-full"
              :style="{ backgroundColor: chartData.datasets[0].backgroundColor[index] }"
            ></span>
            <span class="text-sm font-serif">{{ item.label }}</span>
          </div>
        </div>
      </template>
      <template v-else-if="chartType === 'bar' && items.length">
        <p class="text-lg/7 font-serif font-semibold mb-2 text-center">{{ title }}</p>
        <div class="absolute inset-x-0 top-[2.5rem] bottom-[4.5rem] flex flex-col items-center justify-center">
          <Chart type="bar" :data="chartData" :options="chartOptions"
            class="w-full h-full max-w-full max-h-full" />
        </div>
        <div class="absolute inset-x-0 bottom-0 px-2 pb-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 justify-items-center w-full">
          <div
            v-for="(item, index) in items"
            :key="item.label"
            class="flex items-center space-x-1"
          >
            <span
              class="w-4 h-4 rounded-full"
              :style="{ backgroundColor: chartData.datasets[0].backgroundColor[index] }"
            ></span>
            <span class="text-sm font-serif">{{ item.label }}</span>
          </div>
        </div>
      </template>
      <template v-else-if="items.length">
        <p class="text-lg mb-2 text-center">{{ title }}</p>
        <div class="absolute inset-x-0 flex flex-col items-center justify-center">
          <p class="text-5xl font-serif font-semibold">{{ items[0].value }}</p>
        </div>
      </template>
      <template v-else>
        <p class="text-xl mb-2 text-center">{{ title }}</p>
        <div class="absolute inset-x-0 top-[5rem] bottom-[4.5rem] flex flex-col items-center justify-center">
          <p class="text-[8rem] font-serif font-bold">{{ value }}</p>
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
  // chartType: 'single' | 'doughnut' | 'bar'
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
      hoverOffset: 4
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
</script>