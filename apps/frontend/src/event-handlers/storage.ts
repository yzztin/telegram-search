import type { ClientRegisterEventHandler } from '.'

import { useChatStore } from '../store/useChat'
import { useMessageStore } from '../store/useMessage'

export function registerStorageEventHandlers(
  registerEventHandler: ClientRegisterEventHandler,
) {
  registerEventHandler('storage:dialogs', (data) => {
    useChatStore().chats = data.dialogs
  })

  registerEventHandler('storage:messages', ({ messages }) => {
    useMessageStore().pushMessages(messages)
  })

  // Wait for result event
  registerEventHandler('storage:search:messages:data', ({ messages: _messages }) => {})
}
