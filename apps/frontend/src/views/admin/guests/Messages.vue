<template>
  <div class="min-h-screen">
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

    <div v-if="messages.length > 0">
      <Timeline :value="events" class="w-full">
        <template #opposite="{ item }">
          <div class="text-sm text-gray-600">
            <div>Created: {{ formatDate(item.created) }}</div>
            <div v-if="item.updated && item.updated !== item.created">Updated: {{ formatDate(item.updated) }}</div>
            <div v-if="item.scheduled">Scheduled: {{ formatDate(item.scheduled) }}</div>
          </div>
        </template>
        <template #content="{ item }">
          <Panel
            :header="item.msg.subject"
            class="mb-4 cursor-pointer"
            @click="goToDetail(item.msg.id)"
          >
            <div class="flex justify-between items-center mb-2">
              <Tag
                :value="item.msg.status.charAt(0).toUpperCase() + item.msg.status.slice(1)"
                :severity="{
                  draft: 'info',
                  scheduled: 'warning',
                  sent: 'success'
                }[item.msg.status]"
              />
            </div>
            <div>
              <p class="text-sm">
                {{ item.msg.status === 'scheduled'
                    ? `Scheduled for: ${formatDate(item.scheduled)}`
                    : item.msg.status === 'sent'
                      ? 'Sent'
                      : `Updated: ${formatDate(item.msg.updated_at)}` }}
              </p>
            </div>
            <template #footer>
              <div class="flex space-x-2">
                <Button
                  v-if="item.msg.status === 'draft' || item.msg.status === 'scheduled'"
                  label="Delete"
                  icon="i-solar:trash-bin-minimalistic-bold-duotone"
                  severity="danger"
                  @click.stop="deleteMessage(item.msg.id)"
                />
                <Button
                  v-if="item.msg.status === 'draft' || item.msg.status === 'scheduled'"
                  label="Edit"
                  icon="i-solar:pen-new-square-bold-duotone"
                  severity="secondary"
                  @click.stop="goToDetail(item.msg.id, true)"
                />
              </div>
            </template>
          </Panel>
        </template>
      </Timeline>
    </div>

    <div v-else class="text-center text-gray-500 mt-10">No messages found.</div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import Timeline from 'primevue/timeline';
import Panel from 'primevue/panel';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

const router = useRouter()
const messages = ref([])

const events = computed(() =>
  messages.value
    .map(msg => ({
      id: msg.id,
      created: msg.created_at,
      updated: msg.updated_at,
      scheduled: msg.status === 'scheduled' ? msg.scheduled_for : null,
      msg
    }))
    .sort((a, b) => new Date(b.created) - new Date(a.created))
);

const goToDetail = (id, edit = false) => {
  router.push(edit ? `/admin/guests/messages/${id}/edit` : `/admin/guests/messages/${id}`);
}

const formatDate = (dateValue) => {
  if (!dateValue) return '';
  let dateObj;
  if (typeof dateValue === 'string') {
    let iso = dateValue;
    // Normalize "YYYY-MM-DD HH:mm:ss" to "YYYY-MM-DDTHH:mm:ssZ"
    if (!/[Zz]|[+\-]\d{2}:\d{2}$/.test(iso)) {
      iso = iso.replace(' ', 'T') + 'Z';
    }
    dateObj = new Date(iso);
  } else if (dateValue instanceof Date) {
    dateObj = dateValue;
  } else {
    // Fallback for other types (e.g., timestamps)
    dateObj = new Date(dateValue);
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Europe/Amsterdam'
  }).format(dateObj);
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
