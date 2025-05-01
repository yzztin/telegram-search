import type { ClientRegisterEventHandler } from '.'

import { useChatStore } from '../store/useChat'
import { useMessageStore } from '../store/useMessage'

export function registerStorageEventHandlers(
  registerEventHandler: ClientRegisterEventHandler,
) {
  const chatsStore = useChatStore()
  const messagesStore = useMessageStore()

  registerEventHandler('storage:dialogs', (data) => {
    chatsStore.chats = data.dialogs
  })

  registerEventHandler('storage:messages', ({ messages }) => {
    messagesStore.pushMessages(messages)
  })
}
