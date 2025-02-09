import type { InferModel } from 'drizzle-orm'

import { useLogger } from '@tg-search/common'
import { and, count, eq, gt, lt, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { EmbeddingService } from '../services/embedding'
import { messages, syncState } from './schema/message'

type Message = InferModel<typeof messages>
type NewMessage = InferModel<typeof messages, 'insert'>

// Database connection
const connectionString = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/tg_search'
const client = postgres(connectionString, {
  max: 1,
  onnotice: () => {},
})
export const db = drizzle(client)

const logger = useLogger()

// Initialize embedding service
const embeddingService = new EmbeddingService(
  process.env.OPENAI_API_KEY ?? '',
  process.env.OPENAI_API_BASE,
)

// Message operations
export interface MessageCreateInput {
  id: number
  chatId: number
  type?: 'text' | 'photo' | 'video' | 'document' | 'sticker' | 'other'
  content?: string
  fromId?: number
  replyToId?: number
  forwardFromChatId?: number
  forwardFromMessageId?: number
  views?: number
  forwards?: number
  createdAt: Date
}

export interface SearchOptions {
  chatId?: number
  type?: 'text' | 'photo' | 'video' | 'document' | 'sticker' | 'other'
  startTime?: Date
  endTime?: Date
  limit?: number
  offset?: number
}

/**
 * Create a new message
 */
export async function createMessage(data: NewMessage): Promise<Message[]> {
  logger.withFields({
    id: data.id,
    chatId: data.chatId,
    type: data.type,
    content: data.content,
  }).log('正在保存消息到数据库')

  try {
    // Generate embedding if content is not empty and OpenAI API key is available
    let embedding: number[] | undefined
    if (data.content && process.env.OPENAI_API_KEY) {
      try {
        embedding = await embeddingService.generateEmbedding(data.content)
      }
      catch (error) {
        logger.withFields({ error: String(error) }).log('生成向量嵌入失败')
        // Continue without embedding
      }
    }

    // Insert message
    const result = await db.insert(messages).values({
      id: data.id,
      chatId: data.chatId,
      type: data.type,
      content: data.content,
      embedding: embedding ? `[${embedding.join(',')}]` : null,
      fromId: data.fromId,
      replyToId: data.replyToId,
      forwardFromChatId: data.forwardFromChatId,
      forwardFromMessageId: data.forwardFromMessageId,
      views: data.views,
      forwards: data.forwards,
      createdAt: data.createdAt,
    }).onConflictDoNothing().returning()

    if (result.length > 0) {
      logger.withFields({
        id: result[0].id,
        chatId: result[0].chatId,
        type: result[0].type,
      }).log('消息已保存')
    }

    return result
  }
  catch (error) {
    logger.withFields({ error: String(error) }).log('保存消息失败')
    throw error
  }
}

/**
 * Find similar messages by vector similarity
 */
export async function findSimilarMessages(embedding: number[], options: SearchOptions = {}) {
  const {
    chatId,
    type,
    startTime,
    endTime,
    limit = 10,
    offset = 0,
  } = options

  // Build where conditions
  const conditions = []
  if (chatId)
    conditions.push(eq(messages.chatId, chatId))
  if (type)
    conditions.push(eq(messages.type, type))
  if (startTime)
    conditions.push(gt(messages.createdAt, startTime))
  if (endTime)
    conditions.push(lt(messages.createdAt, endTime))

  // Add condition for non-null embedding
  conditions.push(sql`${messages.embedding} IS NOT NULL`)

  // Convert embedding array to PG array syntax
  const embeddingStr = `'[${embedding.join(',')}]'`

  const query = db.select({
    id: messages.id,
    chatId: messages.chatId,
    type: messages.type,
    content: messages.content,
    createdAt: messages.createdAt,
    fromId: messages.fromId,
    similarity: sql<number>`1 - (${messages.embedding}::vector <=> ${sql.raw(embeddingStr)}::vector)`.as('similarity'),
  })
    .from(messages)
    .where(and(...conditions))
    .orderBy(sql`similarity DESC`)
    .limit(limit)
    .offset(offset)

  return query
}

/**
 * Find messages by chat ID
 */
export async function findMessagesByChatId(chatId: number) {
  return db.select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
}

/**
 * Find message by ID
 */
export async function findMessageById(id: number) {
  return db.select()
    .from(messages)
    .where(eq(messages.id, id))
    .limit(1)
    .then(res => res[0])
}

/**
 * Get message statistics for a chat
 */
export async function getChatStats(chatId: number) {
  const [totalResult, typeResult] = await Promise.all([
    // Get total message count
    db.select({ count: count() })
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .then(res => res[0].count),

    // Get message count by type
    db.select({ type: messages.type, count: count() })
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .groupBy(messages.type),
  ])

  return {
    total: Number(totalResult),
    byType: Object.fromEntries(
      typeResult.map(({ type, count }) => [type, Number(count)]),
    ),
  }
}

export {
  type Message,
  messages,
  type NewMessage,
  syncState,
}
