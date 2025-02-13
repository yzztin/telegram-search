import type { InferModel } from 'drizzle-orm'

import { useLogger } from '@tg-search/common'
import { and, count, eq, gt, lt, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { EmbeddingService } from '../services/embedding'
import { chats, createChatPartition, createMessageContentTable, folders, messages, syncState } from './schema/message'

type Message = InferModel<typeof messages>
type NewMessage = InferModel<typeof messages, 'insert'>
type Chat = InferModel<typeof chats>
type NewChat = InferModel<typeof chats, 'insert'>
type Folder = InferModel<typeof folders>
type NewFolder = InferModel<typeof folders, 'insert'>

// Define message content type
type MessageContent = InferModel<ReturnType<typeof createMessageContentTable>>
type NewMessageContent = InferModel<ReturnType<typeof createMessageContentTable>, 'insert'>

// Database connection
const connectionString = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/tg_search'
const client = postgres(connectionString, {
  max: 1,
  onnotice: () => {},
})
export const db = drizzle(client)

const logger = useLogger()

// Initialize embedding service
const embeddingService = new EmbeddingService()

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

interface MessageWithSimilarity {
  id: number
  chatId: number
  type: string
  content: string | null
  createdAt: Date
  fromId: number | null
  similarity: number
}

/**
 * Create a new message
 */
export async function createMessage(data: MessageCreateInput | MessageCreateInput[]): Promise<Message[]> {
  const messageArray = Array.isArray(data) ? data : [data]
  logger.debug(`正在保存 ${messageArray.length} 条消息到数据库`)

  try {
    // Create partition tables if not exist
    const chatIds = [...new Set(messageArray.map(msg => msg.chatId))]
    for (const chatId of chatIds) {
      await db.execute(createChatPartition(chatId))
    }

    // Insert messages into partition tables and metadata table
    const results = await Promise.all(
      chatIds.map(async (chatId) => {
        const chatMessages = messageArray.filter(msg => msg.chatId === chatId)
        const tableName = `messages_${chatId}`
        const contentTable = createMessageContentTable(chatId)

        // Insert into partition table
        await db.insert(contentTable).values(
          chatMessages.map(msg => ({
            id: msg.id,
            chatId: msg.chatId,
            type: msg.type || 'text',
            content: msg.content || null,
            embedding: null,
            mediaInfo: null,
            createdAt: msg.createdAt,
            fromId: msg.fromId || null,
            replyToId: msg.replyToId || null,
            forwardFromChatId: msg.forwardFromChatId || null,
            forwardFromMessageId: msg.forwardFromMessageId || null,
            views: msg.views || null,
            forwards: msg.forwards || null,
          })),
        ).onConflictDoNothing()

        // Insert metadata into messages table
        return db.insert(messages)
          .values(chatMessages.map(msg => ({
            id: msg.id,
            chatId: msg.chatId,
            type: msg.type || 'text',
            createdAt: msg.createdAt,
            partitionTable: tableName,
          })))
          .onConflictDoNothing()
          .returning()
      }),
    )

    const flatResults = results.flat()
    if (flatResults.length > 0) {
      logger.debug(`已保存 ${flatResults.length} 条消息`)
    }

    return flatResults
  }
  catch (error) {
    logger.withError(error).error('保存消息失败')
    throw error
  }
}

/**
 * Find similar messages by vector similarity
 */
export async function findSimilarMessages(embedding: number[], options: SearchOptions = {}): Promise<MessageWithSimilarity[]> {
  const {
    chatId,
    type,
    startTime,
    endTime,
    limit = 10,
    offset = 0,
  } = options

  // Build where conditions for metadata
  const conditions = []
  if (chatId)
    conditions.push(eq(messages.chatId, chatId))
  if (type)
    conditions.push(eq(messages.type, type))
  if (startTime)
    conditions.push(gt(messages.createdAt, startTime))
  if (endTime)
    conditions.push(lt(messages.createdAt, endTime))

  // Get relevant partition tables
  const partitionTables = await db.select({
    tableName: messages.partitionTable,
  })
    .from(messages)
    .where(and(...conditions))
    .groupBy(messages.partitionTable)

  // Search in each partition table
  const results = await Promise.all(
    partitionTables.map(async ({ tableName }) => {
      const contentTable = createMessageContentTable(Number(tableName.replace('messages_', '')))
      const embeddingStr = `'[${embedding.join(',')}]'`

      return db.select({
        id: contentTable.id,
        chatId: contentTable.chatId,
        type: contentTable.type,
        content: contentTable.content,
        createdAt: contentTable.createdAt,
        fromId: contentTable.fromId,
        similarity: sql<number>`1 - (${contentTable.embedding} <=> ${sql.raw(embeddingStr)}::vector)`.as('similarity'),
      })
        .from(contentTable)
        .where(sql`${contentTable.embedding} IS NOT NULL`)
        .orderBy(sql`${contentTable.embedding} <=> ${sql.raw(embeddingStr)}::vector`)
        .limit(limit)
        .offset(offset)
    }),
  )

  // Merge and sort results
  return results
    .flat()
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
}

/**
 * Find messages by chat ID
 */
export async function findMessagesByChatId(chatId: number) {
  const contentTable = createMessageContentTable(chatId)
  return db.select().from(contentTable).orderBy(contentTable.createdAt)
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

/**
 * Get all chats in database with message counts
 */
export async function getAllChats() {
  return db.select().from(chats).orderBy(chats.lastMessageDate)
}

/**
 * Get all folders in database
 */
export async function getAllFolders() {
  return db.select().from(folders)
}

/**
 * Get chats in folder
 */
export async function getChatsInFolder(folderId: number) {
  return db.select()
    .from(chats)
    .where(eq(chats.folderId, folderId))
    .orderBy(chats.lastMessageDate)
}

/**
 * Update chat info
 */
export async function updateChat(data: NewChat) {
  return db.insert(chats)
    .values(data)
    .onConflictDoUpdate({
      target: chats.id,
      set: {
        name: data.name,
        type: data.type,
        lastMessage: data.lastMessage,
        lastMessageDate: data.lastMessageDate,
        lastSyncTime: data.lastSyncTime,
        messageCount: data.messageCount,
        folderId: data.folderId,
      },
    })
    .returning()
}

/**
 * Update folder info
 */
export async function updateFolder(data: NewFolder) {
  return db.insert(folders)
    .values(data)
    .onConflictDoUpdate({
      target: folders.id,
      set: {
        title: data.title,
        emoji: data.emoji,
        lastSyncTime: data.lastSyncTime,
      },
    })
    .returning()
}

export {
  type Chat,
  chats,
  type Folder,
  folders,
  type Message,
  messages,
  type NewChat,
  type NewFolder,
  type NewMessage,
  syncState,
}
