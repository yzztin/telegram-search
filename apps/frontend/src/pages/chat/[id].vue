<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { useMessageStore } from '../../store/useMessage'
import { useSessionStore } from '../../store/useSession'

const route = useRoute('/chat/:id')
const id = route.params.id

const messageStore = useMessageStore()
const { messagesByChat } = storeToRefs(messageStore)
const chatMessages = computed(() => messagesByChat.value.get(id.toString()) ?? [])

const sessionStore = useSessionStore()
const { getWsContext } = sessionStore

const messageInput = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

// Scroll to bottom when new messages arrive
function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Handle sending new message
function sendMessage() {
  if (!messageInput.value.trim())
    return

  getWsContext()?.sendEvent('message:send', {
    chatId: id.toString(),
    content: messageInput.value,
  })
  messageInput.value = ''
}

onMounted(() => {
  getWsContext()?.sendEvent('message:fetch', {
    chatId: id.toString(),
    pagination: { offset: 0, limit: 50 },
  })
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Chat Header -->
    <div class="p-4 border-b dark:border-gray-700">
      <h2 class="text-xl font-semibold dark:text-gray-100">
        Chat #{{ id }}
      </h2>
    </div>

    <!-- Messages Area -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4"
    >
      <div v-for="message in chatMessages" :key="message.uuid">
        <div class="flex items-start gap-4 rounded-lg p-3 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800">
          <div class="mt-1 h-9 w-9 flex items-center justify-center overflow-hidden bg-muted">
            <img :src="`https://api.dicebear.com/6.x/bottts/svg?seed=${message.fromId}`" alt="User" class="h-full w-full object-cover">
          </div>
          <div class="flex-1">
            <div class="mb-1 flex items-center gap-2">
              <span class="text-gray-900 font-medium dark:text-gray-100">{{ message.fromName }}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ message.createdAt }}</span>
            </div>
            <div class="text-gray-700 dark:text-gray-300">
              {{ message.content }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Message Input -->
    <div class="border-t dark:border-gray-700 p-4">
      <div class="flex gap-2">
        <input
          v-model="messageInput"
          type="text"
          placeholder="Type a message..."
          class="flex-1 rounded-lg border dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 p-2"
          @keyup.enter="sendMessage"
        >
        <button
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          @click="sendMessage"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>
