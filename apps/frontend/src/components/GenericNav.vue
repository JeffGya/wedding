<template>
    <nav>
      <div class="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div class="relative flex items-center justify-between h-16">
          <div class="absolute inset-y-0 left-0 flex items-center sm:hidden">
            <!-- Mobile menu button-->
          </div>
          <div class="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start">
            <div class="hidden sm:block sm:ml-6">
              <div class="flex space-x-4">
                <router-link
                  :to="{ name: 'home', params: { lang } }"
                  class="font-sans text-base hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                Home
                </router-link>
                <!--
                <router-link
                  to="/en/rsvp"
                  class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  RSVP
                </router-link>
                 <router-link
                  to="/en/event-details"
                  class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Event Details
                </router-link>
                -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  </template>
  
  <script>
  export default {
    name: 'GenericNav',
  };
  </script>
  
  <style scoped>
  /* You can add custom styles for the navigation bar here */
  </style>