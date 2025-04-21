<template>
  <div class="relative flex flex-col p-6 max-w-6xl mx-auto min-h-screen">
    <h1 class="text-3xl font-bold mb-6">Message Detail</h1>

    <div class="flex-1">
      <template v-if="message">
        <div class="md:flex md:gap-8">
          <!-- Left column: Message content -->
          <div class="md:w-1/2 space-y-6">
            <div>
              <h2 class="text-xl font-semibold">Subject:</h2>
              <p class="text-gray-800">{{ message.subject }}</p>
            </div>

            <div>
              <h2 class="text-xl font-semibold">Message Content (EN):</h2>
              <div class="prose bg-white p-4 rounded border" v-html="message.body_en"></div>
            </div>

            <div>
              <h2 class="text-xl font-semibold">Message Content (LT):</h2>
              <div class="prose bg-white p-4 rounded border" v-html="message.body_lt"></div>
            </div>

            <div>
              <h2 class="text-xl font-semibold">Status:</h2>
              <p class="text-gray-600 capitalize">{{ message.status }}</p>
            </div>
          </div>

          <!-- Right column: Recipients -->
          <div class="md:w-1/2 mt-8 md:mt-0">
            <h2 class="text-xl font-semibold mb-2">Recipients:</h2>
            <ul class="list-disc list-inside">
              <li v-for="log in deliveryLogs" :key="log.id">
                {{ log.name }} ({{ log.email }}) — 
                <span :class="{
                  'text-green-600': log.delivery_status === 'sent',
                  'text-yellow-600': log.delivery_status === 'pending',
                  'text-red-600': log.delivery_status === 'failed'
                }">{{ log.delivery_status }}</span>
              </li>
            </ul>
          </div>
        </div>
      </template>
      <template v-else>
        <p>Loading message details...</p>
      </template>
    </div>

    <!-- Sticky Button Bar -->
    <div
      class="sticky bottom-0 left-0 right-0 z-10 bg-white px-6 py-4 flex justify-end gap-4 border-t shadow-inner"
      v-if="message"
    >
      <button
        v-if="message.status === 'draft' || message.status === 'scheduled'"
        @click="$router.push(`/admin/guests/messages/${message.id}/edit`)"
        class="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
      >
        Edit Message
      </button>
      <button
        @click="resendFailed"
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Resend Failed
      </button>
      <button
        @click="$router.push('/admin/guests/messages')"
        class="border border-gray-400 px-4 py-2 rounded hover:bg-gray-100"
      >
        Back to Messages
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/api'

const route = useRoute()
const messageId = route.params.id

const message = ref(null)
const deliveryLogs = ref([])

onMounted(async () => {
  const res = await api.get(`/messages/${messageId}`)
  message.value = res.data.message

  const logRes = await api.get(`/messages/${messageId}/logs`)
  deliveryLogs.value = logRes.data.logs
})

const resendFailed = async () => {
  try {
    await api.post(`/messages/${messageId}/resend-failed`)
    const logRes = await api.get(`/messages/${messageId}/logs`)
    deliveryLogs.value = logRes.data.logs
  } catch (err) {
    console.error('Failed to resend failed messages', err)
  }
}
</script>