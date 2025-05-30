<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <h1 class="text-4xl font-bold text-gray-800 text-center mb-6">Guest Messages</h1>
    <p class="text-gray-600 text-center mb-6">View sent and scheduled emails to guests.</p>

    <div class="flex justify-between items-center mb-4">
      <RouterLink
        to="/admin/templates"
        class="text-blue-600 hover:underline text-sm"
      >
        Manage Templates
      </RouterLink>
      <RouterLink
        to="/admin/guests/messages/new"
        class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        + New Message
      </RouterLink>
    </div>

    <div v-if="messages.length > 0" class="space-y-4">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="bg-white border rounded shadow p-4 hover:shadow-md transition cursor-pointer"
        @click="goToDetail(msg.id)"
      >
        <div class="flex justify-between items-center mb-2">
          <h2 class="text-lg font-semibold text-gray-800">{{ msg.subject }}</h2>
          <span
            class="text-sm px-2 py-1 rounded"
            :class="{
              'bg-gray-300 text-gray-800': msg.status === 'draft',
              'bg-yellow-300 text-yellow-800': msg.status === 'scheduled',
              'bg-green-300 text-green-800': msg.status === 'sent'
            }"
          >
            {{ msg.status }}
          </span>
          <RouterLink
            v-if="msg.status === 'draft' || msg.status === 'scheduled'"
            :to="`/admin/guests/messages/${msg.id}/edit`"
            class="text-sm text-blue-600 hover:underline ml-4"
            @click.stop
          >
            Edit
          </RouterLink>
          <button
            v-if="msg.status === 'draft' || msg.status === 'scheduled'"
            @click.stop="deleteMessage(msg.id)"
          >
            Delete
          </button>
        </div>
        <p class="text-gray-500 text-sm">Created: {{ formatDate(msg.created_at) }}</p>
        <p v-if="msg.status === 'scheduled'" class="text-gray-500 text-sm">Scheduled for: {{ formatDate(msg.scheduled_for) }}</p>
        <p v-if="msg.status === 'sent'" class="text-gray-500 text-sm">Sent</p>
        <p v-else class="text-gray-500 text-sm">Updated: {{ formatDate(msg.updated_at) }}</p>
      </div>
    </div>

    <div v-else class="text-center text-gray-500 mt-10">No messages found.</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'

const router = useRouter()
const messages = ref([])

const goToDetail = (id) => {
  router.push(`/admin/guests/messages/${id}`)
}

const formatDate = (dateString) => {
  if (!dateString) return '';
  // If no timezone offset or Z in string, assume UTC
  let iso = dateString;
  if (!/[Zz]|[+\-]\d{2}:\d{2}$/.test(dateString)) {
    // Normalize "YYYY-MM-DD HH:mm:ss" to "YYYY-MM-DDTHH:mm:ssZ"
    iso = dateString.replace(' ', 'T') + 'Z';
  }
  const date = new Date(iso);
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Amsterdam'
  }).format(date);
}

const fetchMessages = async () => {
  try {
    const response = await api.get('/messages')
    messages.value = response.data.messages
  } catch (error) {
    console.error('Failed to load messages:', error)
  }
}

async function deleteMessage(id) {
  if (!confirm('Are you sure you want to delete this message?')) return;
  try {
    await api.delete(`/messages/${id}`);
    // Remove the deleted message from the local list
    messages.value = messages.value.filter(m => m.id !== id);
  } catch (error) {
    console.error('Failed to delete message:', error);
  }
}

onMounted(() => {
  fetchMessages()
})
</script>
