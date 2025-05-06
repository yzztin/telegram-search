import type { EntityLike } from 'telegram/define'
import type { CoreContext } from '../context'
import type { MessageResolverRegistryFn } from '../message-resolvers'
import type { CoreMessage } from '../utils/message'
import type { CorePagination } from '../utils/pagination'
import type { PromiseResult } from '../utils/result'

import { useLogger } from '@tg-search/common'
import bigInt from 'big-integer'
import { Api } from 'telegram'

import { convertToCoreMessage } from '../utils/message'
import { withResult } from '../utils/result'
import { withRetry } from '../utils/retry'

export interface MessageEventToCore {
  'message:fetch': (data: { chatId: string, pagination: CorePagination }) => void
  'message:fetch:abort': (data: { taskId: string }) => void
  'message:process': (data: { messages: Api.Message[] }) => void
  'message:send': (data: { chatId: string, content: string }) => void
}

export interface MessageEventFromCore {
  'message:fetch:progress': (data: { taskId: string, progress: number }) => void
  'message:data': (data: { messages: CoreMessage[] }) => void
}

export type MessageEvent = MessageEventFromCore & MessageEventToCore

export interface FetchMessageOpts {
  chatId: string
  pagination: CorePagination

  startTime?: Date
  endTime?: Date

  // Filter
  skipMedia?: boolean
  messageTypes?: string[]

  // Incremental export
  minId?: number
  maxId?: number
}

export type MessageService = ReturnType<ReturnType<typeof createMessageService>>

export function createMessageService(ctx: CoreContext) {
  const logger = useLogger('core:message:service')

  return (resolvers: MessageResolverRegistryFn) => {
    const { emitter, getClient, withError } = ctx

    // TODO: worker_threads?
    async function processMessages(messages: Api.Message[]) {
      logger.withFields({ count: messages.length }).verbose('Process messages')

      const coreMessages = messages
        .map(message => convertToCoreMessage(message))
        .filter(message => message !== null)

      // Return the messages first
      emitter.emit('message:data', { messages: coreMessages })

      // Embedding or resolve messages
      let emitMessages: CoreMessage[] = coreMessages
      for (const [name, resolver] of resolvers.registry.entries()) {
        logger.withFields({ name }).verbose('Process messages with resolver')

        try {
          const result = (await resolver.run({ messages: emitMessages })).unwrap()
          emitMessages = result.length > 0 ? result : emitMessages
        }
        catch (error) {
          logger.withFields({ error }).warn('Failed to process messages')
        }
      }

      emitter.emit('storage:record:messages', { messages: emitMessages })
    }

    async function getHistoryWithMessagesCount(chatId: EntityLike): PromiseResult<(Api.messages.TypeMessages & { count: number }) | null> {
      try {
        const history = await withRetry(
          () => getClient().invoke(new Api.messages.GetHistory({
            peer: chatId,
            limit: 1,
            offsetId: 0,
            offsetDate: 0,
            addOffset: 0,
            maxId: 0,
            minId: 0,
            hash: bigInt(0),
          })),
        ) as Api.messages.TypeMessages & { count: number }

        return withResult(history, null)
      }
      catch (error) {
        return withResult(null, withError(error, 'Failed to get history'))
      }
    }

    async function* fetchMessages(
      chatId: string,
      options: Omit<FetchMessageOpts, 'chatId'>,
    ): AsyncGenerator<Api.Message> {
      if (!await getClient().isUserAuthorized()) {
        logger.error('User not authorized')
        return
      }

      let offsetId = 0
      let hasMore = true
      let processedCount = 0

      const limit = options.pagination.limit
      const minId = options?.minId
      const maxId = options?.maxId
      const startTime = options?.startTime
      const endTime = options?.endTime

      logger.withFields({
        chatId,
        limit,
        offsetId,
        minId,
        maxId,
        startTime,
        endTime,
      }).verbose('Fetch messages options')

      // const entity = await getClient().getInputEntity(Number(chatId))

      // const dialog = await getClient().invoke(new Api.messages.GetPeerDialogs({
      //   peers: [new Api.PeerChat({ chatId: BigInt(Number(chatId)) })],
      // }))
      // logger.withFields({ chatId, name: dialog.peer.className, json: dialog.toJSON() }).verbose('Got dialog')

      const { data: history, error } = await getHistoryWithMessagesCount(chatId)
      if (error || !history) {
        return
      }

      logger.withFields({ chatId, count: history?.count }).verbose('Got history')

      // await getClient().getDialogs()

      // const chat = dialogs.find(d => d.id?.toString() === chatId)
      // if (!chat) {
      //   throw new Error(`Chat not found: ${chatId}`)
      // }

      // TODO: Abort signal
      while (hasMore) {
        try {
          const messages = await withRetry(
            () => getClient().getMessages(chatId, {
              limit,
              offsetId,
              minId,
              maxId,
              addOffset: options.pagination.offset, // TODO: rename this
            }),
          )

          if (messages.length === 0) {
            logger.error('Get messages failed or returned empty data')
            return withResult(null, new Error('Get messages failed or returned empty data'))
          }

          // If we got fewer messages than requested, there are no more
          hasMore = messages.length === limit

          for (const message of messages) {
          // Skip empty messages
            if (message instanceof Api.MessageEmpty) {
              continue
            }

            // Check time range
            const messageTime = new Date(message.date * 1000)
            if (startTime && messageTime < startTime) {
              continue
            }
            if (endTime && messageTime > endTime) {
              continue
            }

            yield message
            processedCount++

            // Update offsetId to current message ID
            offsetId = message.id

            // Check if we've reached the limit
            if (limit && processedCount >= limit) {
              break
            }
          }
        }
        catch (error) {
          return withResult(null, withError(error, 'Fetch messages failed'))
        }
      }
    }

    async function sendMessage(chatId: string, content: string) {
      const message = await withRetry(() => getClient().invoke(new Api.messages.SendMessage({
        peer: chatId,
        message: content,
      })))

      return withResult(message, null)
    }

    return {
      processMessages,
      getHistoryWithMessagesCount,
      fetchMessages,
      sendMessage,
    }
  }
}
