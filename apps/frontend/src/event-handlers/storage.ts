import type { ClientRegisterEventHandler } from '.'

import { storeToRefs } from 'pinia'

import { useChatStore } from '../store/useChat'
import { useMessageStore } from '../store/useMessage'

export function registerStorageEventHandlers(
  registerEventHandler: ClientRegisterEventHandler,
) {
  const chatsStore = useChatStore()
  const messagesStore = useMessageStore()
  const { messagesByChat } = storeToRefs(messagesStore)

  registerEventHandler('storage:dialogs', (data) => {
    chatsStore.chats = data.dialogs
  })

  registerEventHandler('storage:messages', ({ messages }) => {
    messages.forEach((message) => {
      const { chatId } = message

      if (messagesByChat.value.has(chatId)) {
        messagesByChat.value.get(chatId)!.push(...messages)
      }
      else {
        messagesByChat.value.set(chatId, [message])
      }
    })
  })
}
