import type { CoreMessage, CorePagination } from '@tg-search/core'

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { toast } from 'vue-sonner'

import { useSessionStore } from './useSession'

export const useMessageStore = defineStore('message', () => {
  const messagesByChat = ref<Map<string, CoreMessage[]>>(new Map())

  const sessionStore = useSessionStore()
  const { getWsContext } = sessionStore

  async function pushMessages(messages: CoreMessage[]) {
    messages.forEach((message) => {
      const { chatId } = message

      if (messagesByChat.value.has(chatId)) {
        messagesByChat.value.get(chatId)!.push(message)
      }
      else {
        messagesByChat.value.set(chatId, [message])
      }
    })
  }

  async function fetchMessagesWithDatabase(chatId: string, pagination: CorePagination) {
    toast.promise(async () => {
      getWsContext().sendEvent('storage:fetch:messages', { chatId, pagination })
      const { messages: dbMessages } = await getWsContext().waitForEvent('storage:messages')

      const restMessageLength = pagination.limit - dbMessages.length
      // eslint-disable-next-line no-console
      console.log(`[MessageStore] Fetched ${dbMessages.length} messages from database, rest messages length ${restMessageLength}`)

      if (restMessageLength > 0) {
        pagination.offset += dbMessages.length
        toast.promise(async () => {
          getWsContext().sendEvent('message:fetch', { chatId, pagination })
        }, {
          loading: 'Fetching messages from server...',
        })
      }
    }, {
      loading: 'Loading messages from database...',
      success: 'Messages loaded',
      error: 'Error loading messages',
    })
  }

  return {
    messagesByChat,
    pushMessages,
    fetchMessagesWithDatabase,
  }
})
