import type { Api } from 'telegram'
import type { CoreContext } from '../context'
import type { TakeoutService } from '../services'

import { useLogger } from '@tg-search/common'
import { useConfig } from '@tg-search/common/composable'

import { usePagination } from '../utils/pagination'

export function registerTakeoutEventHandlers(ctx: CoreContext) {
  const { emitter } = ctx
  const logger = useLogger('core:takeout:event')

  return (takeoutService: TakeoutService) => {
    emitter.on('takeout:run', async ({ chatIds }) => {
      logger.withFields({ chatIds }).verbose('Running takeout')
      const pagination = usePagination()
      const batchSize = useConfig().message.batch.size

      let messages: Api.Message[] = []
      for (const chatId of chatIds) {
        for await (const message of takeoutService.takeoutMessages(chatId, { pagination })) {
          messages.push(message)
          // logger.withFields(message).debug('Message taken out')

          if (messages.length >= batchSize) {
            emitter.emit('message:process', { messages })
            messages = []
          }
        }
      }

      if (messages.length > 0) {
        emitter.emit('message:process', { messages })
      }
    })

    emitter.on('takeout:task:abort', ({ taskId }) => {
      logger.withFields({ taskId }).verbose('Aborting takeout task')
      takeoutService.abortTask(taskId)
    })
  }
}
