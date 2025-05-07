<template>
    <Suspense>
      <template #default>
        <component :is="ViewComponent" />
      </template>
      <template #fallback>
        <div>Loading...</div>
      </template>
    </Suspense>
  </template>
  
  <script setup>
  import { computed, defineAsyncComponent } from 'vue'
  import { useRoute } from 'vue-router'
  
  const route = useRoute()
  
  // Glob all public page components
  const pages = import.meta.glob('../views/public/**/*.vue')
  
  // Helper to capitalize route names for filenames
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
  
  const ViewComponent = computed(() => {
    const lang = route.params.lang || 'en'
    const name = capitalize(route.name || 'home')
    const filePath = `../views/public/${lang}/${name}.vue`
  
    const loader = pages[filePath]
    if (loader) {
      return defineAsyncComponent(loader)
    }
  
    // Fallback to English Home if not found
    return defineAsyncComponent(pages['../views/public/en/Home.vue'])
  })
  </script>