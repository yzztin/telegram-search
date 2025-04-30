import type { Api } from 'telegram'
import type { CoreContext } from '../context'
import type { createMessageService } from '../services'

import { useLogger } from '@tg-search/common'
import { useConfig } from '@tg-search/common/composable'

import { usePagination } from '../utils/pagination'

export function registerMessageEventHandlers(ctx: CoreContext) {
  const { emitter } = ctx
  const logger = useLogger('core:message:event')

  return (messageService: ReturnType<typeof createMessageService>) => {
    emitter.on('message:process', ({ messages }) => {
      messageService.processMessages(messages)
    })

    // emitter.on('message:record', ({ message }) => {
    // })

    emitter.on('message:fetch', async ({ chatId }) => {
      logger.withFields({ chatId }).debug('Fetching messages')
      const pagination = usePagination()
      const batchSize = useConfig().message.batch.size

      let messages: Api.Message[] = []
      for await (const message of messageService.fetchMessages(chatId, { pagination })) {
        messages.push(message)

        if (messages.length >= batchSize) {
          emitter.emit('message:process', { messages })
          messages = []
        }
      }

      if (messages.length > 0) {
        emitter.emit('message:process', { messages })
      }
    })
  }
}
