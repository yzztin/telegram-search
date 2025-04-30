import type { ClientRegisterEventHandlerFn } from '.'

import { storeToRefs } from 'pinia'

import { useMessageStore } from '../store/useMessage'

export function registerMessageEventHandlers(
  registerEventHandler: ClientRegisterEventHandlerFn,
) {
  const messageStore = useMessageStore()
  const { messagesByChat } = storeToRefs(messageStore)

  registerEventHandler('message:data', ({ messages }) => {
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
