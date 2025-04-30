<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

import MessageBubble from '../../components/messages/MessageBubble.vue'
import { useMessageStore } from '../../store/useMessage'
import { useSessionStore } from '../../store/useSession'

const route = useRoute('/chat/:id')
const id = route.params.id

const messageStore = useMessageStore()
const { messagesByChat } = storeToRefs(messageStore)
const chatMessages = computed(() => messagesByChat.value.get(id.toString()) ?? [])

const sessionStore = useSessionStore()
const { getWsContext } = sessionStore

onMounted(() => {
  getWsContext()?.sendEvent('message:fetch', {
    chatId: id.toString(),
    pagination: { offset: 0, limit: 10 },
  })
})
</script>

<template>
  <div class="h-full flex flex-col p-2">
    <div class="overflow-auto space-y-0">
      <div v-for="message in chatMessages" :key="message.uuid">
        <MessageBubble :message="message" />
      </div>
    </div>
  </div>
</template>
