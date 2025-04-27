import type { CoreDialog } from '@tg-search/core'

import { defineStore } from 'pinia'
import { onMounted, ref } from 'vue'

import { useSessionStore } from './useSessionV2'

export const useChatStore = defineStore('chat', () => {
  const chats = ref<CoreDialog[]>([])
  const sessionStore = useSessionStore()
  const { getWsContext } = sessionStore

  onMounted(() => {
    if (chats.value.length === 0) {
      getWsContext()?.sendEvent('dialog:fetch')
    }
  })

  return { chats }
})
