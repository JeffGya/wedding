<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Message Detail</h1>
  
    <div v-if="message">
      <div class="mb-6">
        <h2 class="text-xl font-semibold">Subject:</h2>
        <p class="text-gray-800">{{ message.subject }}</p>
      </div>
  
      <div class="mb-6">
        <h2 class="text-xl font-semibold">Message Content (EN):</h2>
        <div class="prose bg-white p-4 rounded border" v-html="message.body_en"></div>
      </div>
  
      <div class="mb-6">
        <h2 class="text-xl font-semibold">Message Content (LT):</h2>
        <div class="prose bg-white p-4 rounded border" v-html="message.body_lt"></div>
      </div>
  
      <div class="mb-6">
        <h2 class="text-xl font-semibold">Status:</h2>
        <p class="text-gray-600 capitalize">{{ message.status }}</p>
      </div>
  
      <div class="mb-6">
        <h2 class="text-xl font-semibold">Recipients:</h2>
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
  
      <div class="flex gap-4 mt-8">
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
    <div v-else>
      <p>Loading message details...</p>
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