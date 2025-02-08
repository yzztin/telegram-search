import { count, eq, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { messages } from './schema/message'

// Database connection
const connectionString = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/tg_search'
const client = postgres(connectionString, {
  max: 1,
  onnotice: () => {},
})
export const db = drizzle(client)

// Message operations
export interface MessageCreateInput {
  id: number
  chatId: number
  type?: 'text' | 'photo' | 'video' | 'document' | 'other'
  content?: string
  fromId?: number
  replyToId?: number
  forwardFromChatId?: number
  forwardFromMessageId?: number
  views?: number
  forwards?: number
  createdAt: Date
}

/**
 * Create a new message
 */
export async function createMessage(data: MessageCreateInput) {
  try {
    console.log('Saving message to database:', data)
    const result = await db.insert(messages).values(data).returning()
    console.log('Message saved:', result)
    return result
  }
  catch (error) {
    console.error('Failed to save message:', error)
    throw error
  }
}

/**
 * Find similar messages by vector similarity
 */
export async function findSimilarMessages(embedding: number[], limit = 10) {
  return db.select()
    .from(messages)
    .orderBy(sql`embedding <-> ${JSON.stringify(embedding)}::vector`)
    .limit(limit)
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
