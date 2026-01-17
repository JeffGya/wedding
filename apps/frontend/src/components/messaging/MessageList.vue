<template>
  <div class="space-y-2">
    <Accordion v-model:value="expandedPanelValue">
      <AccordionPanel
        v-for="(message, index) in messages"
        :key="getMessageKey(message, index)"
        :value="getPanelValue(message, index)"
      >
        <AccordionHeader>
          <div class="flex items-center justify-between w-full pr-4">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <Badge 
                :value="getTypeLabel(type)" 
                :severity="getTypeSeverity(type)"
                class="shrink-0"
              />
              <div class="flex-1 min-w-0">
                <div class="font-medium text-gray-900 truncate">
                  {{ formatSubject(message.subject) }}
                </div>
                <div class="text-sm text-gray-500 mt-1">
                  {{ message.totalSent }} sent, {{ message.totalFailed }} failed, {{ message.uniqueRecipients }} unique recipients
                </div>
              </div>
            </div>
          </div>
        </AccordionHeader>
        <AccordionContent>
          <div class="pt-4 space-y-4">
          <!-- Successful Recipients -->
          <div v-if="message.sentRecipients && message.sentRecipients.length > 0">
            <h4 class="font-semibold text-gray-700 mb-2">Successful Recipients</h4>
            <div class="space-y-2">
              <div
                v-for="recipient in message.sentRecipients"
                :key="recipient.id"
                class="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200"
              >
                <div>
                  <span class="font-medium text-gray-900">{{ recipient.name }}</span>
                  <span class="text-sm text-gray-600 ml-2">{{ recipient.email }}</span>
                </div>
                <div class="text-xs text-gray-500">
                  {{ formatDate(recipient.sentAt) }} ({{ recipient.language }})
                </div>
              </div>
            </div>
          </div>

          <!-- Failed Emails -->
          <div v-if="message.failedDetails && message.failedDetails.length > 0">
            <h4 class="font-semibold text-red-700 mb-2">Failed Emails</h4>
            <div class="space-y-3">
              <div
                v-for="(errorGroup, errorIndex) in message.failedDetails"
                :key="errorIndex"
                class="p-3 bg-red-50 rounded border border-red-200"
              >
                <div class="font-medium text-red-900 mb-2">
                  Error: {{ errorGroup.originalError }}
                </div>
                <div class="text-sm text-gray-700">
                  <span class="font-medium">Affected guests:</span>
                  <span class="ml-2">
                    <span
                      v-for="(guest, guestIndex) in errorGroup.affectedGuests"
                      :key="guest.id"
                    >
                      {{ guest.name }} ({{ guest.email }})
                      <span v-if="guestIndex < errorGroup.affectedGuests.length - 1">, </span>
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Language Breakdown -->
          <div v-if="message.languages">
            <h4 class="font-semibold text-gray-700 mb-2">Language Breakdown</h4>
            <div class="flex gap-4 text-sm">
              <span class="text-gray-600">
                <span class="font-medium">English:</span> {{ message.languages.en || 0 }}
              </span>
              <span class="text-gray-600">
                <span class="font-medium">Lithuanian:</span> {{ message.languages.lt || 0 }}
              </span>
            </div>
          </div>
          </div>
        </AccordionContent>
      </AccordionPanel>
    </Accordion>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import Badge from 'primevue/badge'

const props = defineProps({
  messages: {
    type: Array,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  expandedMessageId: {
    type: [String, Number, Array],
    default: null
  }
})

const emit = defineEmits(['expand'])

const expandedPanelValue = ref(null)

const getTypeLabel = (type) => {
  const labels = {
    custom: 'Custom Messages',
    rsvpAttending: 'RSVP Confirmations (Attending)',
    rsvpNotAttending: 'RSVP Confirmations (Not Attending)'
  }
  return labels[type] || type
}

const getTypeSeverity = (type) => {
  const severities = {
    custom: 'info',
    rsvpAttending: 'success',
    rsvpNotAttending: 'warning'
  }
  return severities[type] || 'info'
}

const formatSubject = (subject) => {
  if (!subject) return 'No subject'
  const en = subject.en || ''
  const lt = subject.lt || ''
  if (en === lt || !lt) {
    return en || 'No subject'
  }
  return `${en} / ${lt}`
}

const formatDate = (dateString) => {
  if (!dateString) return 'Unknown date'
  try {
    const date = new Date(dateString)
    return date.toLocaleString()
  } catch (e) {
    return dateString
  }
}

const getMessageKey = (message, index) => {
  try {
    if (message.messageIds && Array.isArray(message.messageIds) && message.messageIds.length > 0) {
      return `${props.type}-${message.messageIds.join('-')}`
    }
    // Fallback if messageIds is missing or not an array
    return `${props.type}-${message.messageId || message.id || index}`
  } catch (e) {
    return `${props.type}-${index}`
  }
}

const getPanelValue = (message, index) => {
  // Generate a unique value for each panel
  try {
    if (message.messageIds && Array.isArray(message.messageIds) && message.messageIds.length > 0) {
      return `${props.type}-${message.messageIds.join('-')}`
    }
    return `${props.type}-${message.messageId || message.id || index}`
  } catch (e) {
    return `${props.type}-${index}`
  }
}

// Watch for changes to expandedPanelValue and emit expand event
watch(expandedPanelValue, (newValue) => {
  if (newValue === null) {
    emit('expand', null)
  } else {
    // Find the message that matches this panel value
    const message = props.messages.find((msg, idx) => getPanelValue(msg, idx) === newValue)
    if (message && message.messageIds && message.messageIds.length > 0) {
      emit('expand', message.messageIds[0]) // Use first message ID
    }
  }
})

// Watch for external changes to expandedMessageId
watch(() => props.expandedMessageId, (newId) => {
  if (newId === null) {
    expandedPanelValue.value = null
  } else {
    // Find the message with this ID and get its panel value
    const messageIndex = props.messages.findIndex(m => m.messageIds && m.messageIds.includes(newId))
    if (messageIndex !== -1) {
      const message = props.messages[messageIndex]
      expandedPanelValue.value = getPanelValue(message, messageIndex)
    }
  }
}, { immediate: true })
</script>

<style scoped>
:deep(.p-accordion-header) {
  padding: 0.75rem;
}

:deep(.p-accordion-content) {
  padding: 1rem;
}
</style>
