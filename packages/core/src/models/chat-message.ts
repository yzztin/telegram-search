// https://github.com/moeru-ai/airi/blob/main/services/telegram-bot/src/models/chat-message.ts

import type { CoreMessage } from '../utils/message'
import type { CorePagination } from '../utils/pagination'

import { desc, eq } from 'drizzle-orm'

import { withDb } from '../db'
import { chatMessagesTable } from '../db/schema'
import { Ok } from '../utils/monad'
import { retriveJieba } from './utils/retrive-jieba'
import { retriveVector } from './utils/retrive-vector'

type DBInsertMessage = typeof chatMessagesTable.$inferInsert
type DBSelectMessage = typeof chatMessagesTable.$inferSelect

export interface DBRetrivalMessages extends Omit<DBSelectMessage, 'content_vector_1536' | 'content_vector_1024' | 'content_vector_768'> {
  similarity?: number
  time_relevance?: number
  combined_score?: number
}

export async function recordMessages(messages: CoreMessage[]) {
  const dbMessages = messages.map((message) => {
    const replyToName = message.reply.replyToName || ''

    const text = message.content

    const values = {
      platform: message.platform,
      from_id: message.fromId,
      platform_message_id: message.platformMessageId,
      from_name: message.fromName,
      in_chat_id: message.chatId,
      content: text,
      is_reply: message.reply.isReply,
      reply_to_name: replyToName,
      reply_to_id: message.reply.replyToId || '',
      content_vector_1536: message.vectors.vector1536?.length !== 0 ? message.vectors.vector1536 : null,
      content_vector_1024: message.vectors.vector1024?.length !== 0 ? message.vectors.vector1024 : null,
      content_vector_768: message.vectors.vector768?.length !== 0 ? message.vectors.vector768 : null,
      jieba_tokens: message.jiebaTokens,
    } satisfies DBInsertMessage

    return values
  })

  if (dbMessages.length === 0) {
    return
  }

  (await withDb(db => db
    .insert(chatMessagesTable)
    .values(dbMessages)
    .onConflictDoNothing({
      target: [chatMessagesTable.platform_message_id],
    }),
  )).expect('Failed to record messages')
}

export async function fetchMessages(chatId: string, pagination: CorePagination): Promise<CoreMessage[]> {
  const dbMessagesResults = (await withDb(db => db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.in_chat_id, chatId))
    .orderBy(desc(chatMessagesTable.created_at))
    .limit(pagination.limit)
    .offset(pagination.offset),
  )).expect('Failed to fetch messages')

  const coreMessages = dbMessagesResults.map((message) => {
    return {
      uuid: message.id,

      platform: message.platform,
      platformMessageId: message.platform_message_id,
      chatId: message.in_chat_id,

      fromId: message.from_id,
      fromName: message.from_name,

      content: message.content,

      reply: {
        isReply: message.is_reply,
        replyToId: message.reply_to_id,
        replyToName: message.reply_to_name,
      },
      forward: {
        isForward: false,
        // forwardFromChatId: message.forward_from_chat_id,
        // forwardFromChatName: message.forward_from_chat_name,
        // forwardFromMessageId: message.forward_from_message_id,
      },

      vectors: {
        vector1536: message.content_vector_1536 || [],
        vector1024: message.content_vector_1024 || [],
        vector768: message.content_vector_768 || [],
      },

      jiebaTokens: message.jieba_tokens as unknown as string[],

      createdAt: message.created_at,
      updatedAt: message.updated_at,
    } satisfies CoreMessage
  })

  return coreMessages
}

export async function retriveMessages(
  chatId: string,
  content: {
    text?: string
    embedding?: number[]
  },
  pagination?: CorePagination,
) {
  const retrivalMessages: DBRetrivalMessages[] = []

  if (content.text) {
    const relevantMessages = await retriveJieba(chatId, content.text, pagination)
    retrivalMessages.push(...relevantMessages)
  }

  if (content.embedding && content.embedding.length !== 0) {
    const relevantMessages = await retriveVector(chatId, content.embedding, pagination)
    retrivalMessages.push(...relevantMessages)
  }

  return Ok(retrivalMessages)
}
