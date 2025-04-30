import type { CoreMessage } from '@tg-search/core'

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMessageStore = defineStore('message', () => {
  const messagesByChat = ref<Map<string, CoreMessage[]>>(new Map())

  return {
    messagesByChat,
  }
})
