import type { CoreContext } from '../context'
import type { CoreDialog } from '../services'

import { useLogger } from '@tg-search/common'

import { fetchMessages, recordMessages } from '../models/chat-message'
import { getChatMessagesStats } from '../models/chat-message-stats'
import { listJoinedChats, recordJoinedChats } from '../models/chats'

export function registerStorageEventHandlers(ctx: CoreContext) {
  const { emitter } = ctx
  const logger = useLogger('core:storage:event')

  emitter.on('storage:fetch:messages', async ({ chatId, pagination }) => {
    logger.withFields({ chatId, pagination }).verbose('Fetching messages')
    const messages = await fetchMessages(chatId, pagination)
    emitter.emit('storage:messages', { messages })
  })

  emitter.on('storage:record:messages', async ({ messages }) => {
    logger.withFields({ messages: messages.length }).verbose('Recording messages')
    logger.withFields(messages.map(m => ({
      ...m,
      vectors: {
        vector1536: m.vectors.vector1536?.length,
        vector1024: m.vectors.vector1024?.length,
        vector768: m.vectors.vector768?.length,
      },
    })),
    ).debug('Recording messages')
    await recordMessages(messages)
  })

  emitter.on('storage:fetch:dialogs', async () => {
    logger.verbose('Fetching dialogs')

    const dbChats = await listJoinedChats()
    const chatsMessageStats = await getChatMessagesStats()

    logger.withFields({ dbChatsSize: dbChats.length, chatsMessageStatsSize: chatsMessageStats.length }).verbose('Chat message stats')

    const dialogs = dbChats.map((chat) => {
      const chatMessageStats = chatsMessageStats.find(stats => stats.chat_id === chat.chat_id)
      return {
        id: Number(chat.chat_id),
        name: chat.chat_name,
        type: chat.chat_type,
        messageCount: chatMessageStats?.message_count,
      } satisfies CoreDialog
    })

    emitter.emit('storage:dialogs', { dialogs })
  })

  emitter.on('storage:record:dialogs', async ({ dialogs }) => {
    logger.withFields({
      size: dialogs.length,
      users: dialogs.filter(d => d.type === 'user').length,
      groups: dialogs.filter(d => d.type === 'group').length,
      channels: dialogs.filter(d => d.type === 'channel').length,
    }).verbose('Recording dialogs')

    await recordJoinedChats(dialogs)
  })

  emitter.on('storage:search:messages', async ({ params }) => {
    logger.withFields({ params }).verbose('Searching messages')
    // await findRelevantMessages()
  })
}
