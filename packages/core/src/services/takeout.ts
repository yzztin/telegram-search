import type { CoreContext } from '../context'
import type { Result } from '../utils/monad'
import type { CorePagination } from '../utils/pagination'
import type { CoreTask } from '../utils/task'

import { useLogger } from '@tg-search/common'
import bigInt from 'big-integer'
import { Api } from 'telegram'

import { Err, Ok } from '../utils/monad'
import { withRetry } from '../utils/retry'
import { useTasks } from '../utils/task'

export interface TakeoutTaskMetadata {
  chatIds: string[]
}

export interface TakeoutEventToCore {
  'takeout:run': (data: { chatIds: string[] }) => void
  'takeout:task:abort': (data: { taskId: string }) => void
}

export interface TakeoutEventFromCore {
  'takeout:task:progress': (data: CoreTask<'takeout'>) => void
}

export type TakeoutEvent = TakeoutEventFromCore & TakeoutEventToCore

export interface TakeoutOpts {
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

export type TakeoutService = ReturnType<typeof createTakeoutService>

// https://core.telegram.org/api/takeout
export function createTakeoutService(ctx: CoreContext) {
  const { emitter, withError, getClient } = ctx

  const logger = useLogger()

  const { createTask, updateTaskProgress, updateTaskError, abortTask } = useTasks('takeout')

  const emitProgress = (taskId: string, progress: number, message?: string) => {
    emitter.emit('takeout:task:progress', updateTaskProgress(taskId, progress, message))
  }

  const emitError = (taskId: string, error: Error) => {
    emitter.emit('takeout:task:progress', updateTaskError(taskId, error))
  }

  async function initTakeout(): Promise<Result<Api.account.Takeout>> {
    const fileMaxSize = bigInt(1024 * 1024 * 1024) // 1GB

    try {
      // TODO: options
      const takeout = await getClient().invoke(new Api.account.InitTakeoutSession({
        contacts: true,
        messageUsers: true,
        messageChats: true,
        messageMegagroups: true,
        messageChannels: true,
        files: true,
        fileMaxSize,
      }))

      return Ok(takeout)
    }
    catch (error) {
      return Err(withError(error, 'Init takeout session failed'))
    }
  }

  async function finishTakeout(takeout: Api.account.Takeout, success: boolean) {
    try {
      await getClient().invoke(new Api.InvokeWithTakeout({
        takeoutId: takeout.id,
        query: new Api.account.FinishTakeoutSession({
          success,
        }),
      }))

      return Ok(null)
    }
    catch (error) {
      return Err(withError(error, 'Finish takeout session failed'))
    }
  }

  async function* takeoutMessages(
    chatId: string,
    options: Omit<TakeoutOpts, 'chatId'>,
    // abortSignal: AbortSignal,
  ): AsyncGenerator<Api.Message> {
    const { taskId, abortController } = createTask({
      chatIds: [chatId],
    })

    emitProgress(taskId, 1, 'Init takeout session')

    let offsetId = options.pagination.offset
    let hasMore = true
    let processedCount = 0
    let hash: bigint = BigInt(0)

    const limit = options.pagination.limit
    const minId = options.minId
    const maxId = options.maxId
    const startTime = options.startTime
    const endTime = options.endTime

    const takeoutSession = (await initTakeout()).expect('Init takeout session failed')

    emitProgress(taskId, 2, 'Get messages')

    try {
      while (hasMore && !abortController.signal.aborted) {
        // https://core.telegram.org/api/offsets
        const id = BigInt(chatId)
        hash = hash ^ (hash >> 21n)
        hash = hash ^ (hash << 35n)
        hash = hash ^ (hash >> 4n)
        hash = hash + id

        // logger.verbose(`get takeout message ${options?.minId}-${options?.maxId}`)

        const historyQuery = new Api.messages.GetHistory({
          peer: await getClient().getInputEntity(chatId),
          offsetId,
          addOffset: 0,
          limit,
          maxId,
          minId,
          hash: bigInt(hash.toString()),
        })

        logger.withFields(historyQuery).verbose('Historical messages query')

        // emitter.emit('takeout:progress', {
        //   taskId: 'takeout',
        //   progress: 0,
        // })

        const result = await withRetry(async () => await getClient().invoke(
          new Api.InvokeWithTakeout({
            takeoutId: takeoutSession.id,
            query: historyQuery,
          }),
        )) as Record<string, unknown>

        logger.withFields(result).debug('Get messages result')

        // Type safe check
        if (result.length === 0 || !('messages' in result)) {
          logger.error('Get messages failed or returned empty data')
          return Err(new Error('Get messages failed or returned empty data'))
        }

        const messages = result.messages as Api.Message[]

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

          // TODO: progress
          // emitter.emit('takeout:task:progress', updateTaskProgress(taskId, processedCount / limit))

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

      await finishTakeout(takeoutSession, true)

      if (abortController.signal.aborted) {
        emitError(taskId, new Error('Task aborted'))
        return
      }

      emitProgress(taskId, 100)
      logger.withFields({ taskId }).verbose('Takeout messages finished')
    }
    catch (error) {
      logger.withError(error).error('Takeout messages failed')

      // TODO: error handler
      await finishTakeout(takeoutSession, false)
      emitError(taskId, new Error('Takeout messages failed'))
    }
  }

  return {
    takeoutMessages,
    abortTask,
  }
}
